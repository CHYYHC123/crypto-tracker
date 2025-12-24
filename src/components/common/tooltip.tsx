import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/* ---------------- Root ---------------- */

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

/* ---------------- Variants ---------------- */

const tooltipContentVariants = cva('z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs shadow-lg border', {
  variants: {
    variant: {
      default: 'bg-gray-800 text-white border-gray-600',
      subtle: 'bg-gray-700 text-white/90 border-gray-500',
      danger: 'bg-red-600 text-white border-red-500'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

/* ---------------- Types ---------------- */

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  delayDuration?: number;
  asChild?: boolean;
} & VariantProps<typeof tooltipContentVariants>;

export default function Tooltip({ content, children, side = 'top', sideOffset = 6, delayDuration = 200, variant, asChild = true }: TooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content side={side} sideOffset={sideOffset} className={cn(tooltipContentVariants({ variant }))}>
            {content}
            <TooltipPrimitive.Arrow className="fill-gray-800" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipRoot>
    </TooltipProvider>
  );
}
