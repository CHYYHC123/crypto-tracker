// import { RouterProvider } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { TriangleIcon, AlignJustify, TrendingDown, BarChart2, SlidersHorizontal } from 'lucide-react';
import KLineChart from '@/sidepanel/components/KLineChart';
import type { CandleHoverData } from '@/sidepanel/components/KLineChart';
import AssetInfo from '@/sidepanel/components/assetInfo';
import Header from '@/sidepanel/components/header';
import Loading from '@/components/common/loading';
import NoteCard from '@/sidepanel/components/NoteCard';
import { useKlineHistory } from '@/sidepanel/hook/useKlineHistory';
import { useKLineWS } from '@/sidepanel/hook/useKLineWS';
import { useTicker24h } from '@/sidepanel/hook/useTicker24h';
import type { KlineInterval } from '@/types/kline';
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { price_show, formatRatioPercent } from '@/utils/num';
import { ExchangeListMap } from '@/config/exchangeConfig';
import type { ExchangeType } from '@/config/exchangeConfig';

const INTERVALS: { label: string; value: KlineInterval }[] = [
  { label: '1分\n钟', value: '1m' },
  { label: '30分\n钟', value: '30m' },
  { label: '1小\n时', value: '1h' },
  { label: '1\n天', value: '1d' },
  { label: '1\n周', value: '1w' }
];

// 币种全名映射（首版仅列常见币种，未命中时显示 symbol 本身）
const SYMBOL_NAME_MAP: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  BNB: 'BNB',
  XRP: 'XRP',
  SOL: 'Solana',
  DOGE: 'Dogecoin',
  ADA: 'Cardano',
  TRX: 'TRON',
  AVAX: 'Avalanche',
  LINK: 'Chainlink'
};

// ── 纯函数：对 mergedChartData 中 displayCandle.time 之前（含自身）的 close 求 SMA
function calcSMA(
  data: CandlestickData<UTCTimestamp>[],
  atTime: number,
  period: number
): string {
  // 从尾部向前找最后一个 time <= atTime（兼容 ES2021，不用 findLastIndex）
  let idx = -1;
  for (let i = data.length - 1; i >= 0; i--) {
    if ((data[i].time as number) <= atTime) { idx = i; break; }
  }
  if (idx < 0) return '--';
  const startIdx = idx - period + 1;
  if (startIdx < 0) return '--';
  let sum = 0;
  for (let i = startIdx; i <= idx; i++) sum += data[i].close;
  return price_show(sum / period);
}

interface AssetInfoData {
  open: string;
  high: string;
  low: string;
  close: string;
  change: string;
  amplitude: string;
  ma7: string;
  ma25: string;
  ma99: string;
}

// ── 纯函数：由 displayCandle + 完整 chartData 计算 AssetInfoData
function calcAssetInfo(
  candle: CandleHoverData | null,
  data: CandlestickData<UTCTimestamp>[]
): AssetInfoData {
  const empty: AssetInfoData = {
    open: '--', high: '--', low: '--', close: '--',
    change: '--', amplitude: '--', ma7: '--', ma25: '--', ma99: '--'
  };
  if (!candle) return empty;

  const { open, high, low, close, time } = candle;
  const changeVal = open !== 0 ? ((close - open) / open) * 100 : 0;
  const changeStr = (changeVal >= 0 ? '+' : '') + changeVal.toFixed(2) + '%';

  return {
    open: price_show(open),
    high: price_show(high),
    low: price_show(low),
    close: price_show(close),
    change: changeStr,
    amplitude: formatRatioPercent(high - low, open),
    ma7: calcSMA(data, time, 7),
    ma25: calcSMA(data, time, 25),
    ma99: calcSMA(data, time, 99)
  };
}

export default function App() {
  const SYMBOL = 'BTC';
  const EXCHANGE: ExchangeType = 'BN';

  const [klineInterval, setKlineInterval] = useState<KlineInterval>('1d');
  const [hoverCandle, setHoverCandle] = useState<CandleHoverData | null>(null);

  // ── 历史 K 线（REST）
  const { chartData, volumeMap, loading, loadingMore, error, loadOlder } = useKlineHistory({
    exchange: EXCHANGE,
    symbol: SYMBOL,
    interval: klineInterval
  });

  // ── 实时 K 线增量（WS）
  const { wsBar } = useKLineWS({ symbol: SYMBOL, interval: klineInterval });

  // ── 24h 涨跌幅（交易所 ticker 字段，不本地用 K 线推算）
  const { changePercent: headerChange } = useTicker24h({ symbol: SYMBOL, exchange: EXCHANGE });

  // ── 合并 WS 增量到历史数据
  const mergedChartData = useMemo(() => {
    if (!wsBar || chartData.length === 0) return chartData;
    const last = chartData[chartData.length - 1];
    const bar: CandlestickData<UTCTimestamp> = {
      time: wsBar.time,
      open: wsBar.open,
      high: wsBar.high,
      low: wsBar.low,
      close: wsBar.close
    };
    if (wsBar.time === (last.time as number)) {
      return [...chartData.slice(0, -1), bar];
    }
    if (wsBar.time > (last.time as number)) {
      return [...chartData, bar];
    }
    return chartData;
  }, [chartData, wsBar]);

  const mergedVolumeMap = useMemo(() => {
    if (!wsBar) return volumeMap;
    const m = new Map(volumeMap);
    m.set(wsBar.time, { volume: wsBar.volume, quoteVolume: wsBar.quoteVolume });
    return m;
  }, [volumeMap, wsBar]);

  // ── displayCandle：hover 优先，否则用 WS 最新 / 历史最后一根
  const liveBar = useMemo((): CandleHoverData | null => {
    if (wsBar) {
      return { time: wsBar.time as number, open: wsBar.open, high: wsBar.high, low: wsBar.low, close: wsBar.close };
    }
    if (mergedChartData.length > 0) {
      const last = mergedChartData[mergedChartData.length - 1];
      return { time: last.time as number, open: last.open, high: last.high, low: last.low, close: last.close };
    }
    return null;
  }, [wsBar, mergedChartData]);

  const displayCandle = hoverCandle ?? liveBar;

  // ── Header 数据（价格用 liveBar；涨跌幅用 ticker 24h，不受 hover / 当前周期影响）
  const headerPrice = liveBar ? price_show(liveBar.close) : undefined;
  const headerName = SYMBOL_NAME_MAP[SYMBOL] ?? SYMBOL;
  const headerExchange = ExchangeListMap[EXCHANGE]?.name ?? EXCHANGE;

  // ── AssetInfo 数据（依赖 displayCandle + mergedChartData）
  const assetInfoData = useMemo(
    () => calcAssetInfo(displayCandle, mergedChartData),
    [displayCandle, mergedChartData]
  );

  return (
    <>
      <div className="bg-background w-full h-screen">
        <Header
          symbol={SYMBOL}
          name={headerName}
          exchange={headerExchange}
          price={headerPrice}
          change={headerChange}
          onBack={() => {}}
        />

        <div className="m-3 rounded-xl border border-border bg-background ">
          {/* ── 时间周期工具栏 ── */}
          <div className="flex items-center justify-between border-b border-border p-1">
            {/* 左：列表/详情切换 */}
            <button className="p-1.5 rounded hover:bg-foreground/10 transition-colors cursor-pointer">
              <AlignJustify size={16} className="text-foreground/60" />
            </button>

            {/* 中：时间周期 Tabs */}
            <div className="flex items-center gap-0.5">
              {INTERVALS.map(({ label, value }) => {
                const active = value === klineInterval;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setKlineInterval(value);
                      setHoverCandle(null); // 切换周期时清空 hover，避免旧数据残留
                    }}
                    className={`px-2 py-0.5 rounded text-center text-[11px] leading-tight whitespace-pre cursor-pointer transition-colors
                    ${active ? 'text-foreground font-bold' : 'text-foreground/50 hover:text-foreground/80'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* 右：图表类型 / K线 / 指标设置 */}
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 rounded hover:bg-foreground/10 transition-colors cursor-pointer flex items-center gap-0.5">
                <TriangleIcon size={7} className="fill-foreground/60 text-foreground/60 rotate-180" />
                <TrendingDown size={14} className="text-foreground/60" />
              </button>
              <button className="p-1.5 rounded hover:bg-foreground/10 transition-colors cursor-pointer">
                <BarChart2 size={16} className="text-foreground/60" />
              </button>
              <button className="p-1.5 rounded hover:bg-foreground/10 transition-colors cursor-pointer">
                <SlidersHorizontal size={16} className="text-foreground/60" />
              </button>
            </div>
          </div>

          {/* ── 价格统计 + MA 信息 ── */}
          <AssetInfo data={assetInfoData} />

          <div className="relative">
            {loading && chartData.length === 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center min-h-80">
                <Loading />
              </div>
            )}
            {error && <p className="px-3 pt-2 text-[11px] text-red-400">{error}</p>}
            <div className="m-2 border border-border rounded-xl px-2">
              <KLineChart
                className="rounded-xl"
                theme="dark"
                interval={klineInterval}
                data={mergedChartData}
                volumeMap={mergedVolumeMap}
                onCrosshairMove={setHoverCandle}
                onNeedOlder={loadOlder}
                loadingMore={loadingMore}
              />
            </div>
          </div>
        </div>

        <NoteCard />
      </div>
    </>
  );
}
