import * as React from 'react';
import { useCallback } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

/* ---------------- Root ---------------- */

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

/* ---------------- Types ---------------- */

type TooltipVariant = 'default' | 'subtle' | 'danger';

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  delayDuration?: number;
  asChild?: boolean;
  variant?: TooltipVariant;
};

const TooltipContentCSS: React.CSSProperties = {
  overflow: 'hidden',
  borderRadius: '0.375rem',
  paddingLeft: '0.75rem',
  paddingRight: '0.75rem',
  paddingTop: '0.375rem',
  paddingBottom: '0.375rem',
  fontSize: '0.75rem',
  lineHeight: '1rem',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  borderWidth: '1px',
  borderStyle: 'solid',
  pointerEvents: 'none' as const
};

export default function Tooltip({ content, children, side = 'top', sideOffset = 6, delayDuration = 200, variant = 'default', asChild = true }: TooltipProps) {
  // 根据 variant 获取样式
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          backgroundColor: '#dc2626',
          borderColor: '#ef4444',
          color: '#ffffff'
        };
      case 'subtle':
        return {
          backgroundColor: '#374151',
          borderColor: '#6b7280',
          color: 'rgba(255, 255, 255, 0.9)'
        };
      default:
        return {
          backgroundColor: '#1f2937',
          borderColor: '#4b5563',
          color: '#ffffff'
        };
    }
  };

  const variantStyles = getVariantStyles();

  // style.setProperty 是唯一能在 JS 侧写入 !important inline style 的方式，
  // 用于覆盖页面上 z-index: 2001 !important 之类的规则。
  // Radix 会在 content 外层生成一个 [data-radix-popper-content-wrapper] div，
  // 该 wrapper 也需要同步提升 z-index。
  const handleContentRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    el.style.setProperty('z-index', '999999999', 'important');
    const wrapper = el.closest<HTMLElement>('[data-radix-popper-content-wrapper]');
    wrapper?.style.setProperty('z-index', '999999999', 'important');
  }, []);

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            ref={handleContentRef}
            side={side}
            sideOffset={sideOffset}
            style={{ ...TooltipContentCSS, ...variantStyles }}
            onPointerDownOutside={e => e.preventDefault()}
          >
            {content}
            <TooltipPrimitive.Arrow
              style={{
                fill: variantStyles.backgroundColor,
                width: '8px',
                height: '8px'
              }}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipRoot>
    </TooltipProvider>
  );
}
