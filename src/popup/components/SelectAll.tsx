import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Checkbox from '@/components/common/checkbox';
import { cn } from '@/lib/utils';

interface SelectAllProps {
  visible: boolean;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export const SelectAll: React.FC<SelectAllProps> = ({ visible, checked, indeterminate, onChange, className }) => {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current && indeterminate !== undefined) {
      checkboxRef.current.indeterminate = indeterminate;
    } else if (checkboxRef.current) {
      checkboxRef.current.indeterminate = false;
    }
  }, [indeterminate, checked]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={cn('overflow-hidden', className)}
        >
          <div className="flex items-center">
            <Checkbox
              ref={checkboxRef}
              checked={checked && !indeterminate}
              onChange={e => onChange(e.target.checked)}
            />
            <span className="ml-2 text-sm text-gray-100 cursor-pointer select-none" onClick={() => onChange(!checked)}>
              {checked ? '取消全选' : '全选'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

