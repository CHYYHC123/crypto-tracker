import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

type Option = {
  label: string;
  value: string;
  desc?: string;
};

type SelectProps = {
  value?: string;
  onChange?: (value: string) => void;
  options: Option[];
  placeholder?: string;
  errorTip?: string | null;
  className?: string;
};

const Select: React.FC<SelectProps> = ({ value, onChange, options, placeholder = 'Select', errorTip, className }) => {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  // click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key === 'Enter') {
      setOpen(true);
      return;
    }

    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        setHighlighted(i => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        setHighlighted(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        onChange?.(options[highlighted].value);
        setOpen(false);
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      {/* trigger */}
      <div
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={onKeyDown}
        className={cn('min-w-[100px] h-9 px-3 flex items-center justify-between bg-gray-800 rounded-md text-sm text-gray-100 outline-none focus:ring-2 focus:ring-gray-600 cursor-pointer', errorTip && 'ring-1 ring-red-500', className)}
      >
        <span className={cn(!selected && 'text-gray-500')}>{selected?.label ?? placeholder}</span>
        <ChevronDown className="ml-2 text-gray-500" size={14} />
      </div>

      {/* dropdown */}
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="absolute z-50 mt-1 w-full rounded-md bg-gray-800 shadow-lg overflow-hidden p-1">
            {options.map((opt, i) => (
              <li
                key={opt.value}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={cn('rounded-md px-3 py-1.5 cursor-pointer', 'flex flex-col gap-0.5', i === highlighted && 'bg-gray-700')}
              >
                <span className="text-xs leading-tight">{opt.label}</span>

                {opt?.desc && <span className="text-[10px] leading-tight mt-[2px] text-gray-400">{opt.desc}</span>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* error */}
      <AnimatePresence>
        {errorTip && (
          <motion.div className="absolute text-[#ef4444] text-xs mt-[2px]" initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }}>
            {errorTip}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Select;
