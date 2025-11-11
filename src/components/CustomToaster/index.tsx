import React from 'react';
import { Toaster, resolveValue } from 'react-hot-toast';
type CustomToasterProps = {
  targetDivRef?: HTMLDivElement;
};

// ICON SVG
const ICON_MAP = {
  success: (
    <svg width="16" height="16" fill="none" stroke="#22c55e" viewBox="0 0 24 24" style={{ marginRight: 4 }}>
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" fill="none" stroke="#ef4444" viewBox="0 0 24 24" style={{ marginRight: 4 }}>
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
        <div style={{ opacity: t.visible ? 1 : 0, background: '#18181b', padding: '4px 8px', fontSize: 14, borderRadius: 6, color: '#ffffff', border: '1px solid #334155', display: 'flex', alignItems: 'center' }}>
          <div>{ICON_MAP[t.type]}</div>
          <span style={{ fontSize: 12 }}>{resolveValue(t.message, t)}</span>
        </div>
      )}
    </Toaster>
  );
};
