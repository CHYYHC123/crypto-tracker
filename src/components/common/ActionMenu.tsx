import { useState, useRef, useEffect, useLayoutEffect } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type ActionMenuProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};
export function ActionMenu({ open, anchorEl, onClose, children, className }: ActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // null = 未计算，有值 = 已计算
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);

  // 关闭时重置样式，确保下次打开时重新计算
  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
    }
  }, [open]);

  // 测量 + 定位
  useLayoutEffect(() => {
    if (!open || !anchorEl || !menuRef.current) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const menuRect = menuRef.current!.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // ---------- 横向 ----------
      let left = rect.left;
      if (left + menuRect.width > viewportWidth) {
        left = rect.right - menuRect.width;
      }
      left = Math.max(8, left);

      // ---------- 纵向 ----------
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      let top: number;
      if (spaceBelow >= menuRect.height + 8) {
        top = rect.bottom + 4;
      } else if (spaceAbove >= menuRect.height + 8) {
        top = rect.top - menuRect.height - 4;
      } else {
        top = Math.max(8, viewportHeight - menuRect.height - 8);
      }

      setMenuStyle({ position: 'fixed', top, left });
    };

    updatePosition(); // 首次计算

    // 监听滚动 & 窗口大小变化
    window.addEventListener('scroll', updatePosition, true); // capture = true，捕获所有滚动事件
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, anchorEl]);

  // ③ 点击外部关闭
  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !anchorEl?.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, anchorEl, onClose]);

  if (!anchorEl) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          role="menu"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: menuStyle ? 1 : 0, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            visibility: menuStyle ? 'visible' : 'hidden',
            ...menuStyle
          }}
          className={cn('min-w-[160px] rounded-lg bg-[#1c1c1e]', 'border border-white/10 shadow-lg z-50 p-1 box-border', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ActionMenu;
