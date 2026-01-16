import { Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Checkbox from '@/components/common/checkbox';
import { useEffect, useRef } from 'react';

interface RefreshFooterProps {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 倒计时秒数 */
  countdown: number;
  /** 刷新按钮点击回调 */
  onRefresh: () => void;
  /** 是否显示批量选择模式 */
  showCheckboxes?: boolean;
  /** 是否全选 */
  isAllSelected?: boolean;
  /** 是否部分选中（indeterminate） */
  isIndeterminate?: boolean;
  /** 全选/取消全选回调 */
  onToggleSelectAll?: (checked: boolean) => void;
  /** 选中的数量 */
  selectedCount?: number;
  /** 取消批量选择回调 */
  onCancel?: () => void;
  /** 确认删除回调 */
  onConfirmDelete?: () => void;
}


export const Footer = ({ isLoading, countdown, onRefresh, showCheckboxes = false, isAllSelected = false, isIndeterminate = false, onToggleSelectAll, selectedCount = 0, onCancel, onConfirmDelete }: RefreshFooterProps) => {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current && isIndeterminate !== undefined) {
      checkboxRef.current.indeterminate = isIndeterminate;
    } else if (checkboxRef.current) {
      checkboxRef.current.indeterminate = false;
    }
  }, [isIndeterminate, isAllSelected]);

  return (
    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 flex-shrink-0">
      {/* 左侧：倒计时 或 SelectAll */}
      <div className="flex items-center min-w-0 flex-1">
        <AnimatePresence mode="wait">
          {showCheckboxes ? (
            <motion.div key="select-all" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }} className="flex items-center">
              <Checkbox ref={checkboxRef} checked={isAllSelected && !isIndeterminate} onChange={e => onToggleSelectAll?.(e.target.checked)} />
              <span className="ml-2 text-xs text-gray-100 cursor-pointer select-none whitespace-nowrap" onClick={() => onToggleSelectAll?.(!isAllSelected)}>
                {isAllSelected ? '取消全选' : '全选'}
              </span>
            </motion.div>
          ) : (
            <motion.div key="countdown" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }} className="text-xs text-white/50">
              {isLoading ? <Loader className="animate-spin" size={12} /> : `${countdown}s`}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 右侧：Refresh 或 Cancel/Delete */}
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          {showCheckboxes ? (
            <motion.div key="batch-actions" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }} className="flex items-center gap-2">
              <button onClick={onCancel} className="px-3 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer text-xs text-gray-100 whitespace-nowrap">
                Cancel
              </button>
              <button onClick={onConfirmDelete} disabled={selectedCount === 0} className={`px-3 py-1 rounded-md transition cursor-pointer text-xs text-white whitespace-nowrap ${selectedCount === 0 ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>
                Delete ({selectedCount})
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="refresh"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer text-xs whitespace-nowrap"
              onClick={onRefresh}
            >
              Refresh
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
