// import { RouterProvider } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { TriangleIcon, AlignJustify, TrendingDown, BarChart2, SlidersHorizontal, Pencil, Check } from 'lucide-react';
import KLineChart from '@/sidepanel/components/KLineChart';
import AssetInfo from '@/sidepanel/components/assetInfo';
import Header from '@/sidepanel/components/header';
import Loading from '@/components/common/loading';
import { useKlineHistory } from '@/sidepanel/hook/useKlineHistory';
import type { KlineInterval } from '@/types/kline';

const INTERVALS: { label: string; value: KlineInterval }[] = [
  { label: '1分\n钟', value: '1m' },
  { label: '30分\n钟', value: '30m' },
  { label: '1小\n时', value: '1h' },
  { label: '1\n天', value: '1d' },
  { label: '1\n周', value: '1w' }
];

export default function App() {
  // ── 备注状态 ──
  const [note, setNote] = useState('');

  const [savedStatus, setSavedStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [savedTime, setSavedTime] = useState('Just now');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动保存（防抖 1.5s）
  const handleNoteChange = useCallback((val: string) => {
    setNote(val);
    setSavedStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSavedStatus('saving');
      setTimeout(() => {
        setSavedStatus('saved');
        setSavedTime('Just now');
      }, 500);
    }, 1500);
  }, []);

  // 自动撑高 textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [note]);

  // 从备注内容中提取 #tag（第一个 #xxx）
  const tag = note.match(/#[\w-]+/)?.[0] ?? null;

  // 这里开始是获取数据的
  const [klineInterval, setKlineInterval] = useState<KlineInterval>('1d');
  const { chartData, volumeMap, loading, loadingMore, error, loadOlder } = useKlineHistory({
    exchange: 'BN',
    symbol: 'BTC',
    interval: klineInterval
  });

  return (
    <>
      <div className="bg-background w-full h-screen">
        <Header onBack={() => {}} />

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
                    onClick={() => setKlineInterval(value)}
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
          <AssetInfo
            data={{
              open: '231.09',
              high: '234.76',
              low: '229.63',
              close: '230.36',
              change: '-0.31%',
              amplitude: '2.24%',
              ma7: '223.85',
              ma25: '219.29',
              ma99: '210.50'
            }}
          />

          <div className="relative">
            {loading && chartData.length === 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center min-h-80">
                <Loading />
              </div>
            )}
            {error && <p className="px-3 pt-2 text-[11px] text-red-400">{error}</p>}
            <div className="m-2 border border-border rounded-xl px-2">
              <KLineChart className="rounded-xl" theme="dark" data={chartData} volumeMap={volumeMap} onNeedOlder={loadOlder} loadingMore={loadingMore} />
            </div>
          </div>
        </div>

        {/* ── MY NOTE 备注卡片 ── */}
        <div className="mx-3 mb-3 rounded-xl border border-border bg-background overflow-hidden">
          {/* 头部：标题 + 保存状态 */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-violet-500/20 flex items-center justify-center">
                <Pencil size={13} className="text-violet-400" />
              </div>
              <span className="text-foreground font-bold text-xs tracking-widest uppercase">
                My Note <span className="text-foreground/40 font-normal normal-case tracking-normal">（个人备注）</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              {savedStatus === 'saved' && (
                <>
                  <Check size={11} className="text-emerald-400" />
                  <span className="text-emerald-400">Saved · {savedTime}</span>
                </>
              )}
              {savedStatus === 'saving' && <span className="text-foreground/40">Saving…</span>}
              {savedStatus === 'unsaved' && <span className="text-foreground/30">Unsaved</span>}
            </div>
          </div>

          {/* 可编辑文本区域 */}
          <div className="mx-3 mb-3 rounded-lg bg-foreground/8 border border-border/50 px-3 py-2.5">
            <textarea
              ref={textareaRef}
              value={note}
              onChange={e => handleNoteChange(e.target.value)}
              placeholder="Write your trading notes here…"
              rows={1}
              className="w-full bg-transparent text-foreground/80 text-[13px] leading-relaxed resize-none outline-none placeholder:text-foreground/25 overflow-hidden"
              style={{ minHeight: 56 }}
            />
          </div>

          {/* 底部：标签 + 字数 */}
          <div className="flex items-center justify-between px-3 pb-3">
            {tag ? <span className="text-[11px] font-medium text-violet-300 bg-violet-500/20 rounded-md px-2 py-0.5">{tag}</span> : <span />}
            <span className="text-[11px] text-foreground/30">{note.length} characters</span>
          </div>
        </div>
      </div>
    </>
  );
}
