import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string; //
  header?: React.ReactNode; // 新增：自定义整个 Header
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info' | 'custom';
}

const typeStyles = {
  warning: {
    icon: 'text-amber-500',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700'
  },
  danger: {
    icon: 'text-rose-400',
    confirmBtn: 'bg-rose-500/80 hover:bg-rose-500'
  },
  info: {
    icon: 'text-blue-500',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700'
  },
  custom: {
    icon: '',
    confirmBtn: 'bg-gradient-to-r from-[#9d40b0] to-[#6b4ae0] hover:opacity-90 transition-opacity'
  }
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, onClose, onConfirm, title = '', description, header, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
  const styles = typeStyles[type];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div className="fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

          {/* Dialog */}
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', duration: 0.3 }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              {header ? (
                header
              ) : (
                <div className="flex items-center justify-between p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />
                    <h3 className="text-white font-semibold text-base">{title}</h3>
                  </div>
                  <button onClick={onClose} className="text-gray-400 hover:text-white transition cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Content */}
              {description && <div>{description}</div>}

              {/* Actions */}
              <div className="flex gap-3 p-4 pt-3">
                <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-medium transition cursor-pointer">
                  {cancelText}
                </button>
                <button onClick={handleConfirm} className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition cursor-pointer ${styles.confirmBtn}`}>
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
