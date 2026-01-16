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
          className={cn('mb-2 p-3 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-lg', className)}
          style={{ zIndex: 10 }}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer text-sm text-gray-100 flex-1"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={selectedCount === 0}
              className={cn(
                'px-4 py-2 rounded-md transition cursor-pointer text-sm text-white flex-1',
                selectedCount === 0
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
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

