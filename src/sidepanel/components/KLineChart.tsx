import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, Time, TickMarkType, MouseEventParams } from 'lightweight-charts';
import { cn } from '@/lib/utils';
import { mockData, mockVolumeMap, VolumeInfo } from './mockData';
import { formatTimestamp } from '@/utils/time';
import { price_show } from '@/utils/num';

// ── 类型定义
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

interface KLineChartProps {
  data?: CandlestickData<UTCTimestamp>[];
  volumeMap?: Map<number, VolumeInfo>;
  theme?: 'light' | 'dark';
  className?: string;
  onCrosshairMove?: (data: CandleHoverData | null) => void;
}

// ── 组件
const KLineChart: React.FC<KLineChartProps> = ({ data = mockData, volumeMap = mockVolumeMap, theme = 'dark', className, onCrosshairMove }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null);
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;

  // 默认显示最后一根 K 线（顶部信息栏用）
  const lastCandle = data[data.length - 1];
  const defaultHover: CandleHoverData | null = lastCandle ? { time: lastCandle.time as number, open: lastCandle.open, high: lastCandle.high, low: lastCandle.low, close: lastCandle.close } : null;

  const [hoverData, setHoverData] = useState<CandleHoverData | null>(defaultHover);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isDark = theme === 'dark';

    // 1. 创建图表实例
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#121318' : '#ffffff' },
        textColor: isDark ? '#A0A0A0' : '#333333'
      },
      grid: {
        vertLines: { color: isDark ? '#1F2329' : '#F0F0F0', style: 1 },
        horzLines: { color: isDark ? '#1F2329' : '#F0F0F0', style: 1 }
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number, tickMarkType: TickMarkType) => {
          if (tickMarkType === TickMarkType.Time) return formatTimestamp(time, 'HH:mm');
          if (tickMarkType === TickMarkType.DayOfMonth) return formatTimestamp(time, 'MM-DD');
          if (tickMarkType === TickMarkType.Month) return formatTimestamp(time, 'YYYY-MM');
          return formatTimestamp(time, 'YYYY');
        }
      },
      rightPriceScale: { visible: false }
    });

    // 2. 添加 K 线系列
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350'
    });

    // 3. 写入数据
    candlestickSeries.setData(data);
    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // 4. 监听容器尺寸
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    // 5. 十字准线 → 浮动 Tooltip
    const lastData = data[data.length - 1];
    const lastCandleSnap: CandleHoverData | null = lastData ? { time: lastData.time as number, open: lastData.open, high: lastData.high, low: lastData.low, close: lastData.close } : null;

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time || !param.point) {
        // 鼠标移出 → 恢复顶部信息栏为最后一根，隐藏浮动 tooltip
        setHoverData(lastCandleSnap);
        setTooltip(null);
        onCrosshairMoveRef.current?.(lastCandleSnap);
        return;
      }

      const candle = param.seriesData.get(candlestickSeries) as CandlestickData | undefined;
      if (!candle) return;

      const t = param.time as number;
      const vol = volumeMap.get(t);

      const next: CandleHoverData = { time: t, open: candle.open, high: candle.high, low: candle.low, close: candle.close };
      setHoverData(next);
      onCrosshairMoveRef.current?.(next);

      setTooltip({
        ...next,
        x: param.point.x,
        y: param.point.y,
        volume: vol?.volume ?? 0,
        quoteVolume: vol?.quoteVolume ?? 0
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    // 6. 清理
    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [theme]);

  // 数据更新
  useEffect(() => {
    if (seriesRef.current) seriesRef.current.setData(data);
  }, [data]);

  const containerW = chartContainerRef.current?.clientWidth ?? 400;
  const TOOLTIP_W = 140;

  return (
    <div className="relative w-full">
      {/* ── 浮动 Tooltip（跟随鼠标） ── */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none rounded-lg px-3 py-2 text-[11px] space-y-0.5 min-w-10"
          style={{
            background: 'rgba(18,19,24,0.88)',
            border: '1px solid rgba(255,255,255,0.08)',
            // 防止超出右侧：x 大于容器一半时显示在左侧
            left: tooltip.x + TOOLTIP_W + 20 > containerW ? tooltip.x - TOOLTIP_W - 8 : tooltip.x + 16,
            top: Math.max(4, tooltip.y - 60)
          }}
        >
          {/* 时间 */}
          <div className="flex justify-between gap-2 pb-1 border-b border-white/10 mb-1">
            <span className="text-white/40">时间</span>
            <span className="text-white/80">{formatTimestamp(tooltip.time, 'MM-DD HH:mm')}</span>
          </div>
          {/* OHLC */}
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
          {/* 量 / 额 / 振幅 */}
          <div className="flex justify-between gap-2 pt-1 border-t border-white/10 mt-1">
            <span className="text-white/40">振幅</span>
            <span className="text-white/80">{(((tooltip.high - tooltip.low) / tooltip.open) * 100).toFixed(2)}%</span>
          </div>
        </div>
      )}

      <div ref={chartContainerRef} className={cn('w-full overflow-hidden', className)} />
    </div>
  );
};

export default KLineChart;
