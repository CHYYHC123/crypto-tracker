import { cn } from '@/lib/utils';

interface PopularSuggestionsProps {
  items: readonly string[] | string[];
  addedSet: Set<string>;
  loading: boolean;
  onSelect: (symbol: string) => void;
  suffix?: string;
  title?: string;
}

export default function PopularSuggestions({ items, addedSet, loading, onSelect, suffix = '', title = 'Popular Suggestions' }: PopularSuggestionsProps) {
  return (
    <div className="px-4 py-2">
      <p className="text-[10px] font-semibold tracking-widest text-white/35 uppercase mb-2">{title}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map(symbol => {
          const added = addedSet.has(symbol);
          return (
            <button
              key={symbol}
              disabled={loading || added}
              onClick={() => onSelect(symbol)}
              className={cn('text-xs font-medium py-2 rounded-xl border transition-all duration-150', 'border-white/12 text-white/65 bg-white/5', added || loading ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/12 hover:text-white hover:border-white/25 cursor-pointer active:scale-95')}
            >
              {symbol}
              {suffix}
            </button>
          );
        })}
      </div>
    </div>
  );
}
