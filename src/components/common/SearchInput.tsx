import type { CompositionEvent, KeyboardEvent, Ref, RefObject } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
  onCompositionStart?: () => void;
  onCompositionEnd?: (e: CompositionEvent<HTMLInputElement>) => void;
}

export default function SearchInput({ value, onChange, onKeyDown, onClear, placeholder = 'Search...', inputRef, className, onCompositionStart, onCompositionEnd }: SearchInputProps) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
  };

  return (
    <div className={`flex items-center gap-2 bg-input rounded-xl px-3 py-2.5 border border-border focus-within:border-foreground/25 transition ${className ?? ''}`}>
      <Search className="w-4 h-4 text-muted shrink-0" />
      <input
        ref={inputRef as Ref<HTMLInputElement>}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        placeholder={placeholder}
        className="bg-transparent text-foreground text-sm placeholder:text-muted outline-none w-full"
      />
      {value && (
        <button onClick={handleClear} className="text-muted hover:text-foreground transition cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
