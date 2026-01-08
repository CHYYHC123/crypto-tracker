import * as React from 'react';
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
  // 基础样式（对应 Tailwind 类名）
  overflow: 'hidden',
  borderRadius: '0.375rem', // rounded-md
  paddingLeft: '0.75rem', // px-3
  paddingRight: '0.75rem', // px-3
  paddingTop: '0.375rem', // py-1.5
  paddingBottom: '0.375rem', // py-1.5
  fontSize: '0.75rem', // text-xs
  lineHeight: '1rem',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // shadow-lg
  borderWidth: '1px',
  borderStyle: 'solid',
  // 其他样式
  zIndex: 999999999,
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

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={sideOffset}
            style={{
              ...TooltipContentCSS,
              // Variant 样式
              ...variantStyles
            }}
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
