import { Pencil, Check } from 'lucide-react';
import type { AssetTypes } from '@/types/asset';
import { useAssetNote } from '@/sidepanel/hook/useAssetNote';

interface NoteCardProps {
  symbol: string;
  category: AssetTypes;
}

export default function NoteCard({ symbol, category }: NoteCardProps) {
  const { content, savedStatus, savedTime, handleChange } = useAssetNote(category, symbol);

  // 从备注内容中提取 #tag（第一个 #xxx）
  const tag = content.match(/#[\w-]+/)?.[0] ?? null;

  return (
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
          value={content}
          onChange={e => handleChange(e.target.value)}
          placeholder="Write your trading notes here…"
          className="w-full bg-transparent text-foreground/80 text-[13px] leading-relaxed resize-none outline-none placeholder:text-foreground/25 min-h-20 max-h-40 overflow-y-auto"
        />
      </div>

      {/* 底部：标签 + 字数 */}
      <div className="flex items-center justify-between px-3 pb-3">
        {tag ? <span className="text-[11px] font-medium text-violet-300 bg-violet-500/20 rounded-md px-2 py-0.5">{tag}</span> : <span />}
        <span className="text-[11px] text-foreground/30">{content.length} characters</span>
      </div>
    </div>
  );
}
