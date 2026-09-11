import type { KeyboardEvent, Ref, RefObject } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}

export default function SearchInput({ value, onChange, onKeyDown, onClear, placeholder = 'Search...', inputRef, className }: SearchInputProps) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
  };

  return (
    <div className={`flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2.5 border border-white/10 focus-within:border-white/25 transition ${className ?? ''}`}>
      <Search className="w-4 h-4 text-white/35 shrink-0" />
      <input
        ref={inputRef as Ref<HTMLInputElement>}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="bg-transparent text-white text-sm placeholder:text-white/25 outline-none w-full"
      />
      {value && (
        <button onClick={handleClear} className="text-white/30 hover:text-white/60 transition cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
