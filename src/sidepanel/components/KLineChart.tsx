import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, CrosshairMode, LineStyle, IChartApi, ISeriesApi, IPriceLine, CandlestickData, HistogramData, UTCTimestamp, Time, TickMarkType, MouseEventParams, LogicalRange } from 'lightweight-charts';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/utils/time';
import { formatRatioPercent, price_show } from '@/utils/num';
import type { KlineInterval, VolumeInfo } from '@/types/kline';

const EMPTY_VOLUME_MAP: Map<number, VolumeInfo> = new Map();
/** 可视范围左缘小于该值时触发加载更早数据 */
const LEFT_EDGE = 10;
/** 最新一根左侧可见的大致根数 */
const BARS_TO_LEFT = 35;
/** 最新一根右侧留白（逻辑坐标，单位≈一根 K 线宽），截图里右侧约一半空白 */
const RIGHT_PAD = 20;
/** 仅主图高度 */
const CHART_HEIGHT = 320;
/** 主图 + 成交量窗格总高度 */
const CHART_HEIGHT_WITH_VOLUME = 420;
const VOL_UP = 'rgba(38, 166, 154, 0.7)';
const VOL_DOWN = 'rgba(239, 83, 80, 0.7)';

const INTERVAL_MS: Record<KlineInterval, number> = {
  '1m': 60_000,
  '30m': 30 * 60_000,
  '1h': 3600_000,
  '1d': 86400_000,
  '1w': 7 * 86400_000
};

function toVolumeData(data: CandlestickData<UTCTimestamp>[], volumeMap: Map<number, VolumeInfo>): HistogramData<UTCTimestamp>[] {
  return data.map(bar => {
    const up = bar.close >= bar.open;
    return {
      time: bar.time,
      value: volumeMap.get(bar.time as number)?.volume ?? 0,
      color: up ? VOL_UP : VOL_DOWN
    };
  });
}

/** 首屏 / 切周期：看最新一段，右侧留空，最后一根落在画面偏中，不贴右 */
function focusLatestWithRightPad(chart: IChartApi, barCount: number) {
  if (barCount <= 0) return;
  const last = barCount - 1;
  chart.timeScale().setVisibleLogicalRange({
    from: last - BARS_TO_LEFT,
    to: last + RIGHT_PAD
  });
}

/** 当前 K 线收盘倒计时文案 */
function formatCandleRemain(lastOpenSec: number, interval: KlineInterval): string {
  const end = lastOpenSec * 1000 + INTERVAL_MS[interval];
  const ms = Math.max(0, end - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) return `${d}D:${String(h).padStart(2, '0')}H`;
  if (h > 0) return `${h}H:${String(m).padStart(2, '0')}M`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 格式化底部时间
function formatBottomTime(time: number, tickMarkType: TickMarkType) {
  if (tickMarkType === TickMarkType.Time) return formatTimestamp(time, 'HH:mm');
  if (tickMarkType === TickMarkType.DayOfMonth) return formatTimestamp(time, 'MM/DD');
  if (tickMarkType === TickMarkType.Month) return formatTimestamp(time, 'YYYY/MM');
  return formatTimestamp(time, 'YYYY');
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

interface LastPriceState {
  y: number;
  price: number;
  remainText: string;
}

interface KLineChartProps {
  data?: CandlestickData<UTCTimestamp>[]; // 蜡烛图数据
  volumeMap?: Map<number, VolumeInfo>; // 成交量数据
  theme?: 'light' | 'dark';
  className?: string;
  /** 当前 K 线周期，用于收盘倒计时 */
  interval?: KlineInterval;
  /** 鼠标移动时触发 */
  onCrosshairMove?: (data: CandleHoverData | null) => void;
  /** 用户滑到左边缘时拉取更早的一页 */
  onNeedOlder?: () => void;
  /** 是否正在加载更多数据 */
  loadingMore?: boolean;
  showVolume?: boolean; // 是否显示成交量
}

const KLineChart: React.FC<KLineChartProps> = ({ data = [], volumeMap = EMPTY_VOLUME_MAP, theme = 'dark', className, interval = '1d', onCrosshairMove, onNeedOlder, loadingMore = false, showVolume = false }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram', Time> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  const onNeedOlderRef = useRef(onNeedOlder);
  const dataRef = useRef(data);
  const volumeMapRef = useRef(volumeMap);
  const loadingMoreRef = useRef(loadingMore);
  const intervalRef = useRef(interval);
  const prevDataRef = useRef<CandlestickData<UTCTimestamp>[]>([]);
  /** setData / 平移可视范围期间忽略左缘回调，避免连发请求 */
  const adjustingRangeRef = useRef(false);
  const syncLastPriceRef = useRef<() => void>(() => {});

  onCrosshairMoveRef.current = onCrosshairMove;
  onNeedOlderRef.current = onNeedOlder;
  dataRef.current = data;
  volumeMapRef.current = volumeMap;
  loadingMoreRef.current = loadingMore;
  intervalRef.current = interval;

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoverPrice, setHoverPrice] = useState<HoverPriceState | null>(null);
  const [lastPrice, setLastPrice] = useState<LastPriceState | null>(null);

  const syncLastPrice = () => {
    const series = seriesRef.current;
    const last = dataRef.current[dataRef.current.length - 1];
    if (!series || !last) {
      if (series && priceLineRef.current) {
        series.removePriceLine(priceLineRef.current);
        priceLineRef.current = null;
      }
      setLastPrice(null);
      return;
    }

    const price = last.close;
    if (!priceLineRef.current) {
      priceLineRef.current = series.createPriceLine({
        price,
        color: 'rgba(255,255,255,0.45)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: ''
      });
    } else {
      priceLineRef.current.applyOptions({ price });
    }

    const y = series.priceToCoordinate(price);
    if (y == null) {
      setLastPrice(null);
      return;
    }

    setLastPrice({
      y,
      price,
      remainText: formatCandleRemain(last.time as number, intervalRef.current)
    });
  };
  syncLastPriceRef.current = syncLastPrice;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isDark = theme === 'dark';
    const chartHeight = showVolume ? CHART_HEIGHT_WITH_VOLUME : CHART_HEIGHT;

    // 创建图表(图表配置项)
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#111827' : '#eff2f7' },
        textColor: isDark ? '#A0A0A0' : '#333333',
        attributionLogo: false,
        panes: {
          separatorColor: isDark ? '#2A2E37' : '#E5E7EB',
          separatorHoverColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.08)',
          enableResize: true
        }
      },
      grid: {
        vertLines: { color: isDark ? '#1F2329' : '#F0F0F0', style: 1 },
        horzLines: { color: isDark ? '#1F2329' : '#F0F0F0', style: 1 }
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: RIGHT_PAD,
        tickMarkFormatter: formatBottomTime
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

    // 下方成交量柱（与 K 线共用时间轴）
    let volumeSeries: ISeriesApi<'Histogram', Time> | null = null;
    if (showVolume) {
      volumeSeries = chart.addSeries(
        HistogramSeries,
        {
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
          lastValueVisible: false,
          priceLineVisible: false
        },
        1
      );
      const panes = chart.panes();
      panes[0]?.setStretchFactor(3);
      panes[1]?.setStretchFactor(1);
      panes[1]?.priceScale('volume').applyOptions({
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.15, bottom: 0 }
      });
      volumeSeries.setData(toVolumeData(dataRef.current, volumeMapRef.current));
    }

    // 设置蜡烛图数据
    candlestickSeries.setData(dataRef.current);
    prevDataRef.current = dataRef.current;
    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    priceLineRef.current = null;
    if (dataRef.current.length > 0) {
      adjustingRangeRef.current = true;
      focusLatestWithRightPad(chart, dataRef.current.length);
      adjustingRangeRef.current = false;
    }
    syncLastPriceRef.current();

    // 监听窗口大小变化
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        });
        requestAnimationFrame(() => syncLastPriceRef.current());
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

    // 监听鼠标移动：横线跟鼠标 Y，右侧白块用坐标换价格；OHLC 浮层只在点到蜡烛时出现；最新价标签始终独立显示
    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.point) {
        setTooltip(null);
        setHoverPrice(null);
        onCrosshairMoveRef.current?.(lastCandleOf());
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
      syncLastPriceRef.current();
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
      volumeSeriesRef.current = null;
      priceLineRef.current = null;
      setTooltip(null);
      setHoverPrice(null);
      setLastPrice(null);
    };
  }, [theme, showVolume]);

  useEffect(() => {
    const series = seriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const prev = prevDataRef.current;
    const range = chart.timeScale().getVisibleLogicalRange();
    const isPrepend =
      prev.length > 0 &&
      data.length > prev.length &&
      data[0]?.time !== prev[0]?.time &&
      data[data.length - 1]?.time === prev[prev.length - 1]?.time;
    // 仅首屏或切周期清空后重新有数据时居中；用户缩放/平移后不再抢焦点
    const shouldFocusLatest = prev.length === 0 && data.length > 0;

    adjustingRangeRef.current = true;
    series.setData(data);
    volumeSeries?.setData(toVolumeData(data, volumeMap));
    if (isPrepend && range) {
      // 左滑翻页：平移可视范围，保持用户当前看到的位置
      const added = data.length - prev.length;
      chart.timeScale().setVisibleLogicalRange({
        from: range.from + added,
        to: range.to + added
      });
    } else if (shouldFocusLatest) {
      focusLatestWithRightPad(chart, data.length);
    } else if (range && data.length > 0) {
      // setData / WS 更新后恢复用户当前窗口，避免被拉回最新
      chart.timeScale().setVisibleLogicalRange(range);
    }
    adjustingRangeRef.current = false;
    prevDataRef.current = data;
    // setData 后 priceLine 仍挂在 series 上，只需更新价格与标签位置
    syncLastPriceRef.current();
  }, [data, volumeMap]);

  // 倒计时每秒刷新；切周期时立即重算
  useEffect(() => {
    syncLastPriceRef.current();
    const id = window.setInterval(() => syncLastPriceRef.current(), 1000);
    return () => window.clearInterval(id);
  }, [interval]);

  const containerW = chartContainerRef.current?.clientWidth ?? 400;
  const TOOLTIP_W = 140;
  const chartHeight = showVolume ? CHART_HEIGHT_WITH_VOLUME : CHART_HEIGHT;

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
            <span className="text-white/80">{formatRatioPercent(tooltip.high - tooltip.low, tooltip.open)}</span>
          </div>
        </div>
      )}

      {/* 鼠标悬停：横向价格 + 相对最新收盘涨跌幅 */}
      {hoverPrice && (
        <div
          className="absolute z-30 pointer-events-none rounded-md bg-white px-2 py-1 text-[10px] leading-tight shadow-md min-w-10"
          style={{
            right: -30,
            top: Math.max(12, Math.min(hoverPrice.y, chartHeight - 12)),
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

      {/* 最新价虚线末端：现价 + 本根剩余时间（始终显示） */}
      {lastPrice && (
        <div
          className="absolute z-20 pointer-events-none rounded-md px-2 py-1 text-[10px] leading-tight min-w-10"
          style={{
            right: -20,
            top: Math.max(12, Math.min(lastPrice.y, chartHeight - 12)),
            transform: 'translateY(-50%)',
            background: 'rgba(18,19,24,0.92)',
            border: '1px solid rgba(255,255,255,0.22)'
          }}
        >
          <div className="text-white font-medium tabular-nums">{price_show(lastPrice.price)}</div>
          <div className="text-white/70 tabular-nums">{lastPrice.remainText}</div>
        </div>
      )}

      <div ref={chartContainerRef} className={cn('w-full overflow-hidden', className)} />
    </div>
  );
};

export default KLineChart;
