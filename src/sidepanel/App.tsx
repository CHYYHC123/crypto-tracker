// import { RouterProvider } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { TriangleIcon, AlignJustify, TrendingDown, BarChart2, SlidersHorizontal } from 'lucide-react';
import KLineChart from '@/sidepanel/components/KLineChart';
import type { CandleHoverData } from '@/sidepanel/components/KLineChart';
import AssetInfo from '@/sidepanel/components/assetInfo';
import Header from '@/sidepanel/components/header';
import Loading from '@/components/common/loading';
import NoteCard from '@/sidepanel/components/NoteCard';
import { useKlineHistory } from '@/sidepanel/hook/useKlineHistory';
import { useKlineExchange } from '@/sidepanel/hook/useKlineExchange';
import { useKLineWS } from '@/sidepanel/hook/useKLineWS';
import { useSidepanelAsset } from '@/sidepanel/hook/useSidepanelAsset';
import { useEquitySymbol } from '@/sidepanel/hook/useEquitySymbol';
import type { KlineInterval } from '@/types/kline';
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { price_show, formatRatioPercent } from '@/utils/num';
import { Exchange, ExchangeListMap, type SelectableExchangeType } from '@/config/exchangeConfig';
import { KlineRestConfig } from '@/sidepanel/config/klineRest';

const ALL_INTERVALS: { label: string; value: KlineInterval }[] = [
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
function calcSMA(data: CandlestickData<UTCTimestamp>[], atTime: number, period: number): string {
  // 从尾部向前找最后一个 time <= atTime（兼容 ES2021，不用 findLastIndex）
  let idx = -1;
  for (let i = data.length - 1; i >= 0; i--) {
    if ((data[i].time as number) <= atTime) {
      idx = i;
      break;
    }
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
function calcAssetInfo(candle: CandleHoverData | null, data: CandlestickData<UTCTimestamp>[]): AssetInfoData {
  const empty: AssetInfoData = {
    open: '--',
    high: '--',
    low: '--',
    close: '--',
    change: '--',
    amplitude: '--',
    ma7: '--',
    ma25: '--',
    ma99: '--'
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
  const exchange = useKlineExchange();
  const sidepanelAsset = useSidepanelAsset();
  const SYMBOL = sidepanelAsset.symbol;

  const [klineInterval, setKlineInterval] = useState<KlineInterval>('1d');
  const [hoverCandle, setHoverCandle] = useState<CandleHoverData | null>(null);

  const intervals = useMemo(() => {
    const supported = KlineRestConfig[exchange]?.intervals;
    if (!supported) return ALL_INTERVALS;
    return ALL_INTERVALS.filter(item => supported[item.value] != null);
  }, [exchange]);

  useEffect(() => {
    setHoverCandle(null);
  }, [sidepanelAsset.id, sidepanelAsset.symbol]);

  // 切到股票等只支持部分周期的交易所时，纠正当前选中周期
  useEffect(() => {
    if (intervals.some(item => item.value === klineInterval)) return;
    setKlineInterval(intervals[0]?.value ?? '1d');
  }, [intervals, klineInterval]);

  // ── 历史 K 线（REST）
  const { chartData, volumeMap, loading, loadingMore, error, loadOlder } = useKlineHistory({
    exchange,
    symbol: SYMBOL,
    interval: klineInterval
  });

  // ── 实时 K 线 + ticker（按 exchange 走 KlineWsRegistry）
  const {
    wsBar,
    lastPrice,
    changePercent: wsChange
  } = useKLineWS({
    exchange,
    symbol: SYMBOL,
    interval: klineInterval
  });

  // ── 股票首屏：全名 + 价格/涨跌 seed（WS ticker 到达后覆盖）
  const isStock = exchange === Exchange.BNStock;
  const equity = useEquitySymbol(SYMBOL, isStock);

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

  // ── Header：WS ticker 优先，股票 get-symbol 作 seed；名称股票用接口 n
  const headerPrice = lastPrice != null ? price_show(lastPrice) : equity?.price != null ? price_show(equity.price) : undefined;
  const headerChange = wsChange ?? equity?.changePercent;
  const headerName = isStock ? equity?.name || undefined : (SYMBOL_NAME_MAP[SYMBOL] ?? SYMBOL);
  const headerExchange = isStock ? 'Binance Stock' : (ExchangeListMap[exchange as SelectableExchangeType]?.name ?? exchange);

  // ── AssetInfo 数据（依赖 displayCandle + mergedChartData）
  const assetInfoData = useMemo(() => calcAssetInfo(displayCandle, mergedChartData), [displayCandle, mergedChartData]);

  return (
    <>
      <div className="bg-background w-full h-screen">
        <Header symbol={SYMBOL} name={headerName} category={isStock ? 'stocks' : 'crypto'} exchange={headerExchange} price={headerPrice} change={headerChange} />

        <div className="m-3 rounded-xl border border-border bg-background ">
          {/* ── 时间周期工具栏 ── */}
          <div className="flex items-center justify-between border-b border-border p-1">
            {/* 左：列表/详情切换 */}
            <button className="p-1.5 rounded hover:bg-foreground/10 transition-colors cursor-pointer">
              <AlignJustify size={16} className="text-foreground/60" />
            </button>

            {/* 中：时间周期 Tabs */}
            <div className="flex items-center gap-0.5">
              {intervals.map(({ label, value }) => {
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
              <KLineChart className="rounded-xl" interval={klineInterval} category={isStock ? 'stocks' : 'crypto'} data={mergedChartData} volumeMap={mergedVolumeMap} onCrosshairMove={setHoverCandle} onNeedOlder={loadOlder} loadingMore={loadingMore} />
            </div>
          </div>
        </div>

        <NoteCard />
      </div>
    </>
  );
}
