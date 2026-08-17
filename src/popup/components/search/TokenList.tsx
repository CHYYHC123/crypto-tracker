import type { ReactNode } from 'react';
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import type { AssetTypes } from '@/types/index';
import Logo from '@/components/common/logo';

interface TokenListProps {
  list: Array<{ symbol: string; desc?: string }>;
  addedSet: Set<string>;
  loading: boolean;
  mode: AssetTypes;
  onSelect: (symbol: string) => void;
}

// 空状态
const EmptyState = () => (
  <div className="flex flex-col items-center py-6 text-white/25">
    <p className="text-sm">No tokens found</p>
  </div>
);

// 外层包裹样式
const CommonItem = ({ symbol, added, loading, onSelect, children }: { symbol: string; added: boolean; loading: boolean; onSelect: (symbol: string) => void; children: ReactNode }) => (
  <button disabled={loading || added} onClick={() => onSelect(symbol)} className={cn('w-full flex items-center justify-between px-4 py-2.5 transition-all duration-100', added ? 'opacity-25 cursor-not-allowed' : 'hover:bg-white/6 cursor-pointer active:bg-white/12')}>
    {children}
  </button>
);

// 加密货币项组件
const TokenItem = ({ symbol, added, loading, onSelect }: { symbol: string; added: boolean; loading: boolean; onSelect: (symbol: string) => void }) => (
  <CommonItem symbol={symbol} added={added} loading={loading} onSelect={onSelect}>
    <span className="text-sm font-bold text-white">{symbol} / USDT</span>
    <span className="text-xs text-white/35">{symbol}</span>
  </CommonItem>
);

// 股票项组件
const StockItem = ({ symbol, desc, added, loading, onSelect }: { symbol: string; desc: string; added: boolean; loading: boolean; onSelect: (symbol: string) => void }) => (
  <CommonItem symbol={symbol} added={added} loading={loading} onSelect={onSelect}>
    <div className="flex items-center gap-2.5">
      <Logo symbol={symbol} category="stock" size="sm" rounded="rounded-full" />
      <div className="flex flex-col items-start">
        <span className="text-sm font-bold text-white">{symbol}</span>
        <span className="text-[11px] text-white/35 truncate max-w-44">{desc}</span>
      </div>
    </div>
  </CommonItem>
);

// 搜索列表
export const TokenList = ({ list, addedSet, loading, mode, onSelect }: TokenListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: list.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (mode === 'stocks' ? 52 : 41)
  });

  const isEmpty = !list.length;

  return (
    <>
      <div className="px-4 pt-2 pb-1">
        <p className="text-[10px] font-semibold tracking-widest text-white/35 uppercase">
          Symbols
          <span className="ml-1.5 text-white/20 normal-case tracking-normal font-normal">({list.length})</span>
        </p>
      </div>
      <div ref={parentRef} className="overflow-y-auto h-50 scrollbar-hide pb-3">
        {isEmpty && <EmptyState />}
        {!isEmpty && (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map(vItem => {
              const item = list[vItem.index];
              const added = addedSet.has(item.symbol);
              return (
                <div key={vItem.key} style={{ position: 'absolute', top: vItem.start, width: '100%' }}>
                  {mode === 'stocks' ? <StockItem symbol={item.symbol} desc={item.desc!} added={added} loading={loading} onSelect={onSelect} /> : <TokenItem symbol={item.symbol} added={added} loading={loading} onSelect={onSelect} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
