import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BatchActionsProps {
  visible: boolean;
  selectedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  className?: string;
}

export const BatchActions: React.FC<BatchActionsProps> = ({ visible, selectedCount, onCancel, onConfirm, className }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={cn('mb-2 p-3 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg', className)}
          style={{ zIndex: 10 }}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-surface rounded-md hover:bg-surface-hover transition cursor-pointer text-sm text-foreground flex-1"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={selectedCount === 0}
              className={cn(
                'px-4 py-2 rounded-md transition cursor-pointer text-sm text-primary-foreground flex-1',
                selectedCount === 0
                  ? 'bg-input text-muted cursor-not-allowed'
                  : 'bg-danger hover:opacity-90'
              )}
            >
              Delete ({selectedCount})
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

