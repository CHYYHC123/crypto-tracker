import React from 'react';
import { cn } from '@/lib/utils';
import { useComposition } from '@/hooks/useComposition';
import { motion, AnimatePresence } from 'framer-motion';

type InputProps = React.ComponentProps<'input'> & {
  errorTip?: null | string;
};

const Input: React.FC<InputProps> = ({ type = 'text', className, onKeyDown, onCompositionStart, onCompositionEnd, errorTip, ...props }) => {
  // 判断 error, 只要 error 存在都认为是错误
  const isError = !!errorTip;
  // const dialogComposition = useDialogComposition();
  // Add composition event handlers to support input method editor (IME) for CJK languages.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown
  } = useComposition<HTMLInputElement>({
    onKeyDown: e => {
      // Check if this is an Enter key that should be blocked
      const isComposing = (e.nativeEvent as any).isComposing;

      // If Enter key is pressed while composing or just after composition ended,
      // don't call the user's onKeyDown (this blocks the business logic)
      if (e.key === 'Enter' && isComposing) {
        return;
      }

      // Otherwise, call the user's onKeyDown
      onKeyDown?.(e);
    },
    onCompositionStart: e => {
      // dialogComposition.setComposing(true);
      onCompositionStart?.(e);
    },
    onCompositionEnd: e => {
      // Mark that composition just ended - this helps handle the Enter key that confirms input
      // dialogComposition.markCompositionEnd();
      // Delay setting composing to false to handle Safari's event order
      // In Safari, compositionEnd fires before the ESC keydown event
      // setTimeout(() => {
      //   dialogComposition.setComposing(false);
      // }, 100);
      onCompositionEnd?.(e);
    }
  });
  return (
    <motion.div className="w-full">
      <input
        type={type}
        data-slot="input"
        className={cn('text-sm w-full max-w-sm h-9 px-3 bg-gray-800 rounded-md text-gray-100 placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-gray-600 transition', className)}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        {...props}
      />
      <AnimatePresence>
        {errorTip && (
          <motion.div key={errorTip} className="absolute text-[#ef4444] text-xs mt-[2px]" initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.18 }}>
            {errorTip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Input;
