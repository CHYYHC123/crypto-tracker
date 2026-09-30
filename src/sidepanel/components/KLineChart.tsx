import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, CrosshairMode, LineStyle, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, Time, TickMarkType, MouseEventParams, LogicalRange } from 'lightweight-charts';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/utils/time';
import { price_show } from '@/utils/num';
import type { VolumeInfo } from '@/types/kline';

const EMPTY_VOLUME_MAP: Map<number, VolumeInfo> = new Map();
/** 可视范围左缘小于该值时触发加载更早数据 */
const LEFT_EDGE = 10;
/** 最新一根左侧可见的大致根数 */
const BARS_TO_LEFT = 35;
/** 最新一根右侧留白（逻辑坐标，单位≈一根 K 线宽），截图里右侧约一半空白 */
const RIGHT_PAD = 20;

/** 首屏 / 切周期：看最新一段，右侧留空，最后一根落在画面偏中，不贴右 */
function focusLatestWithRightPad(chart: IChartApi, barCount: number) {
  if (barCount <= 0) return;
  const last = barCount - 1;
  chart.timeScale().setVisibleLogicalRange({
    from: last - BARS_TO_LEFT,
    to: last + RIGHT_PAD
  });
}

export interface CandleHoverData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TooltipState extends CandleHoverData {
  x: number;
  y: number;
  volume: number;
  quoteVolume: number;
}

interface HoverPriceState {
  y: number;
  price: number;
  pct: number;
}

interface KLineChartProps {
  data?: CandlestickData<UTCTimestamp>[];
  volumeMap?: Map<number, VolumeInfo>;
  theme?: 'light' | 'dark';
  className?: string;
  onCrosshairMove?: (data: CandleHoverData | null) => void;
  /** 用户滑到左边缘时拉取更早的一页 */
  onNeedOlder?: () => void;
  loadingMore?: boolean;
}

const KLineChart: React.FC<KLineChartProps> = ({ data = [], volumeMap = EMPTY_VOLUME_MAP, theme = 'dark', className, onCrosshairMove, onNeedOlder, loadingMore = false }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null);
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  const onNeedOlderRef = useRef(onNeedOlder);
  const dataRef = useRef(data);
  const volumeMapRef = useRef(volumeMap);
  const loadingMoreRef = useRef(loadingMore);
  const prevDataRef = useRef<CandlestickData<UTCTimestamp>[]>([]);
  /** setData / 平移可视范围期间忽略左缘回调，避免连发请求 */
  const adjustingRangeRef = useRef(false);

  onCrosshairMoveRef.current = onCrosshairMove;
  onNeedOlderRef.current = onNeedOlder;
  dataRef.current = data;
  volumeMapRef.current = volumeMap;
  loadingMoreRef.current = loadingMore;

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoverPrice, setHoverPrice] = useState<HoverPriceState | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isDark = theme === 'dark';

    // 创建图表(图表配置项)
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#111827' : '#eff2f7' },
        textColor: isDark ? '#A0A0A0' : '#333333',
        attributionLogo: false
      },
      grid: {
        vertLines: { color: isDark ? '#1F2329' : '#F0F0F0', style: 1 },
        horzLines: { color: isDark ? '#1F2329' : '#F0F0F0', style: 1 }
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: RIGHT_PAD,
        tickMarkFormatter: (time: number, tickMarkType: TickMarkType) => {
          if (tickMarkType === TickMarkType.Time) return formatTimestamp(time, 'HH:mm');
          if (tickMarkType === TickMarkType.DayOfMonth) return formatTimestamp(time, 'MM-DD');
          if (tickMarkType === TickMarkType.Month) return formatTimestamp(time, 'YYYY-MM');
          return formatTimestamp(time, 'YYYY');
        }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.22)', width: 1, style: LineStyle.Dashed, labelVisible: false },
        horzLine: { color: 'rgba(255,255,255,0.22)', width: 1, style: LineStyle.Dashed, labelVisible: false }
      },
      rightPriceScale: { visible: false }
    });

    // 添加蜡烛图系列
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      lastValueVisible: false,
      priceLineVisible: false
    });

    // 设置蜡烛图数据
    candlestickSeries.setData(dataRef.current);
    prevDataRef.current = dataRef.current;
    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    if (dataRef.current.length > 0) {
      adjustingRangeRef.current = true;
      focusLatestWithRightPad(chart, dataRef.current.length);
      adjustingRangeRef.current = false;
    }

    // 监听窗口大小变化
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        });
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    // 获取最后一个蜡烛数据
    const lastCandleOf = (): CandleHoverData | null => {
      const last = dataRef.current[dataRef.current.length - 1];
      if (!last) return null;
      return { time: last.time as number, open: last.open, high: last.high, low: last.low, close: last.close };
    };

    // 监听鼠标移动：横线跟鼠标 Y，右侧白块用坐标换价格；OHLC 浮层只在点到蜡烛时出现
    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.point) {
        const lastCandle = lastCandleOf();
        setTooltip(null);
        setHoverPrice(null);
        onCrosshairMoveRef.current?.(lastCandle);
        return;
      }

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      if (price == null) {
        setHoverPrice(null);
      } else {
        const last = dataRef.current[dataRef.current.length - 1];
        const pct = last && last.close !== 0 ? ((price - last.close) / last.close) * 100 : 0;
        setHoverPrice({ y: param.point.y, price, pct });
      }

      if (!param.time) {
        setTooltip(null);
        onCrosshairMoveRef.current?.(lastCandleOf());
        return;
      }

      const candle = param.seriesData.get(candlestickSeries) as CandlestickData | undefined;
      if (!candle) {
        setTooltip(null);
        onCrosshairMoveRef.current?.(lastCandleOf());
        return;
      }

      const t = param.time as number;
      const vol = volumeMapRef.current.get(t);
      const next: CandleHoverData = { time: t, open: candle.open, high: candle.high, low: candle.low, close: candle.close };
      onCrosshairMoveRef.current?.(next);
      setTooltip({
        ...next,
        x: param.point.x,
        y: param.point.y,
        volume: vol?.volume ?? 0,
        quoteVolume: vol?.quoteVolume ?? 0
      });
    };

    // 监听可视范围变化
    const handleVisibleRange = (range: LogicalRange | null) => {
      if (adjustingRangeRef.current || !range || loadingMoreRef.current) return;
      if (dataRef.current.length === 0) return;
      if (range.from < LEFT_EDGE) onNeedOlderRef.current?.();
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRange);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRange);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setTooltip(null);
      setHoverPrice(null);
    };
  }, [theme]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const prev = prevDataRef.current;
    const range = chart.timeScale().getVisibleLogicalRange();
    const isPrepend = prev.length > 0 && data.length > prev.length && data[0]?.time !== prev[0]?.time && data[data.length - 1]?.time === prev[prev.length - 1]?.time;

    adjustingRangeRef.current = true;
    series.setData(data);
    if (isPrepend && range) {
      // 左滑翻页：平移可视范围，保持用户当前看到的位置
      const added = data.length - prev.length;
      chart.timeScale().setVisibleLogicalRange({
        from: range.from + added,
        to: range.to + added
      });
    } else if (data.length > 0) {
      // 首屏 / 切周期：看最新一段，右侧留白（类似截图）
      focusLatestWithRightPad(chart, data.length);
    }
    adjustingRangeRef.current = false;
    prevDataRef.current = data;
  }, [data]);

  const containerW = chartContainerRef.current?.clientWidth ?? 400;
  const TOOLTIP_W = 140;

  return (
    // K线价格详情
    <div className="relative w-full">
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none rounded-lg px-3 py-2 text-[11px] space-y-0.5 min-w-10"
          style={{
            background: 'rgba(18,19,24,0.88)',
            border: '1px solid rgba(255,255,255,0.08)',
            left: tooltip.x + TOOLTIP_W + 20 > containerW ? tooltip.x - TOOLTIP_W - 8 : tooltip.x + 16,
            top: Math.max(4, tooltip.y - 60)
          }}
        >
          <div className="flex justify-between gap-2 pb-1 border-b border-white/10 mb-1">
            <span className="text-white/40">时间</span>
            <span className="text-white/80">{formatTimestamp(tooltip.time, 'MM-DD HH:mm')}</span>
          </div>
          {(
            [
              { label: '开', value: price_show(tooltip.open), color: 'text-white/80' },
              { label: '高', value: price_show(tooltip.high), color: 'text-emerald-400' },
              { label: '低', value: price_show(tooltip.low), color: 'text-red-400' },
              { label: '收', value: price_show(tooltip.close), color: 'text-white/80' }
            ] as const
          ).map(({ label, value, color }) => (
            <div key={label} className="flex justify-between gap-2">
              <span className="text-white/40">{label}</span>
              <span className={color}>{value}</span>
            </div>
          ))}
          <div className="flex justify-between gap-2 pt-1 border-t border-white/10 mt-1">
            <span className="text-white/40">振幅</span>
            <span className="text-white/80">{(((tooltip.high - tooltip.low) / tooltip.open) * 100).toFixed(2)}%</span>
          </div>
        </div>
      )}

      {/* 价格浮动 */}
      {hoverPrice && (
        <div
          className="absolute z-20 pointer-events-none rounded-md bg-white px-2 py-1 text-[10px] leading-tight shadow-md min-w-10"
          style={{
            right: -30,
            top: Math.max(12, Math.min(hoverPrice.y, 308)),
            transform: 'translateY(-50%)'
          }}
        >
          <div className="text-black font-medium tabular-nums">{price_show(hoverPrice.price)}</div>
          <div className={`tabular-nums ${hoverPrice.pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {hoverPrice.pct >= 0 ? '+' : ''}
            {hoverPrice.pct.toFixed(2)}%
          </div>
        </div>
      )}

      <div ref={chartContainerRef} className={cn('w-full overflow-hidden', className)} />
    </div>
  );
};

export default KLineChart;
