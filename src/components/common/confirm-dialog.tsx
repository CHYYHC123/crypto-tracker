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
    icon: 'text-warning',
    confirmBtn: 'bg-warning hover:opacity-90'
  },
  danger: {
    icon: 'text-danger',
    confirmBtn: 'bg-danger hover:opacity-90'
  },
  info: {
    icon: 'text-primary',
    confirmBtn: 'bg-primary hover:bg-primary-hover'
  },
  custom: {
    icon: '',
    confirmBtn: 'bg-primary hover:bg-primary-hover transition-opacity'
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
            <motion.div className="bg-surface rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-border" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', duration: 0.3 }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              {header ? (
                header
              ) : (
                <div className="flex items-center justify-between p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />
                    <h3 className="text-foreground-bold font-semibold text-base">{title}</h3>
                  </div>
                  <button onClick={onClose} className="text-muted hover:text-foreground-bold transition cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Content */}
              {description && <div>{description}</div>}

              {/* Actions */}
              <div className="flex gap-3 p-4 pt-3">
                <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-input hover:bg-surface-hover text-foreground font-medium transition cursor-pointer">
                  {cancelText}
                </button>
                <button onClick={handleConfirm} className={`flex-1 px-4 py-2 rounded-lg text-primary-foreground font-medium transition cursor-pointer ${styles.confirmBtn}`}>
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
