import React, { useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type CheckboxProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  label?: string;
  className?: string;
  labelClassName?: string;
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, className, labelClassName, disabled, checked, onChange, ...props }, ref) => {
  const [isChecked, setIsChecked] = React.useState(checked ?? false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isIndeterminate, setIsIndeterminate] = React.useState(false);
  const internalRef = React.useRef<HTMLInputElement>(null);

  // 合并外部 ref 和内部 ref
  React.useEffect(() => {
    if (typeof ref === 'function') {
      ref(internalRef.current);
    } else if (ref) {
      ref.current = internalRef.current;
    }
  }, [ref]);

  useEffect(() => {
    setIsChecked(checked ?? false);
  }, [checked]);

  useEffect(() => {
    const input = internalRef.current;
    if (!input) return;

    // 使用 MutationObserver 监听 indeterminate 属性变化
    const observer = new MutationObserver(() => {
      setIsIndeterminate(input.indeterminate);
    });

    observer.observe(input, {
      attributes: true,
      attributeFilter: ['indeterminate']
    });

    // 初始检查
    setIsIndeterminate(input.indeterminate);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(e.target.checked);
    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLLabelElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        setIsChecked(!isChecked);
        // 创建一个合成事件来触发 onChange
        const input = e.currentTarget.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (input) {
          input.checked = !isChecked;
          const syntheticEvent = {
            ...e,
            target: input,
            currentTarget: input
          } as unknown as React.ChangeEvent<HTMLInputElement>;
          onChange?.(syntheticEvent);
        }
      }
    }
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none', disabled && 'cursor-not-allowed opacity-50', labelClassName)} onKeyDown={handleKeyDown} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} tabIndex={disabled ? -1 : 0}>
        <div className="relative inline-flex items-center">
          <input
            ref={internalRef}
            type="checkbox"
            data-slot="checkbox"
            checked={isChecked}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <motion.div
            className={cn(
              'relative w-4 h-4 rounded border-2 transition-colors',
              isChecked || isIndeterminate ? 'bg-gray-600 border-gray-600' : 'bg-gray-800 border-gray-600',
              isFocused && 'ring-2 ring-gray-600 ring-offset-2 ring-offset-gray-900',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            animate={{
              scale: isChecked || isIndeterminate ? [1, 1.1, 1] : 1
            }}
            transition={{ duration: 0.2 }}
          >
            <AnimatePresence mode="wait">
              {isIndeterminate ? (
                <motion.div key="indeterminate" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 flex items-center justify-center">
                  <Minus size={12} className="text-white" strokeWidth={3} />
                </motion.div>
              ) : isChecked ? (
                <motion.div key="checked" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>
        {label && <span className={cn('text-sm text-gray-100', disabled && 'opacity-50')}>{label}</span>}
      </label>
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;
