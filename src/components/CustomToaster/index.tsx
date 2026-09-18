import React from 'react';
import { Toaster, resolveValue, toast } from 'react-hot-toast';
import { BellRing } from 'lucide-react';
type CustomToasterProps = {
  targetDivRef?: HTMLDivElement;
};

// ICON SVG
const ICON_MAP = {
  success: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="mr-1 text-success">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="mr-1 text-danger">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path d="M15 9l-6 6M9 9l6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  loading: (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: 4 }}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#93c5fd" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="#3b82f6" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  ),
  blank: null,
  custom: null
};

export const CustomToaster: React.FC<CustomToasterProps> = () => {
  return (
    <Toaster containerStyle={{ position: 'absolute' }}>
      {t => (
        <div className="flex items-center rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground" style={{ opacity: t.visible ? 1 : 0 }}>
          <div>{ICON_MAP[t.type]}</div>
          <span style={{ fontSize: 12 }}>{resolveValue(t.message, t)}</span>
        </div>
      )}
    </Toaster>
  );
};

// ====== 封装价格预警调用方法 ======
export function showPriceUp(message: string, duration = 5000) {
  toast.custom(
    t => (
      <div className="flex items-center rounded-md border border-border bg-success-bg px-2 py-1 text-sm text-foreground" style={{ opacity: t.visible ? 1 : 0 }}>
        <BellRing size={12} className="mr-2 text-warning" />
        <span className="text-xs">{message}</span>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="ml-1 text-success">
          <path d="M12 19V5M12 5l-4 4M12 5l4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { duration }
  );
}

export function showPriceDown(message: string, duration = 5000) {
  toast.custom(
    t => (
      <div className="flex items-center rounded-md border border-border bg-danger/15 px-2 py-1 text-sm text-foreground" style={{ opacity: t.visible ? 1 : 0 }}>
        <BellRing size={12} className="mr-2 text-warning" />
        <span className="text-xs">{message}</span>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="ml-1 text-danger">
          <path d="M12 5v14M12 19l-4-4M12 19l4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { duration }
  );
}
