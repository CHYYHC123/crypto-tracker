import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', {
  variants: {
    color: {
      default: 'bg-gray-600 text-white',
      secondary: 'bg-gray-500 text-white',
      critical: 'bg-red-500 text-white',
      success: 'bg-green-500 text-white',
      warning: 'bg-yellow-500 text-white',
      info: 'bg-blue-500 text-white'
    },
    radius: {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full'
    },
    size: {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-1',
      lg: 'text-base px-3 py-1.5'
    }
  },
  defaultVariants: {
    color: 'default',
    radius: 'md',
    size: 'md'
  }
});

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants> & {
    /**
     * Badge 内容，可以是文字、数字、组件等
     */
    children: React.ReactNode;
    /**
     * 是否为圆形 Badge（当为 true 时，会覆盖 radius 属性，显示为完全圆形）
     */
    circle?: boolean;
    /**
     * 自定义颜色（当提供时，会覆盖 color 变体）
     * 可以是 CSS 颜色值，如 '#ff0000' 或 'rgb(255, 0, 0)'
     */
    customColor?: string;
  };

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, children, color, radius, size, circle = false, customColor, ...props }, ref) => {
  // 如果设置了 circle，强制使用 rounded-full
  const finalRadius = circle ? 'full' : radius;

  // 构建样式对象
  const style: React.CSSProperties = customColor
    ? {
        backgroundColor: customColor,
        color: getContrastColor(customColor)
      }
    : {};

  return (
    <div ref={ref} className={cn(badgeVariants({ color, radius: finalRadius, size }), circle && 'aspect-square p-0 min-w-[1.5rem]', className)} style={style} {...props}>
      {children}
    </div>
  );
});

Badge.displayName = 'Badge';

/**
 * 根据背景色计算对比色（用于确保文字可读性）
 */
function getContrastColor(hexColor: string): string {
  // 如果是 rgb/rgba 格式，转换为 hex
  if (hexColor.startsWith('rgb')) {
    const matches = hexColor.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const r = parseInt(matches[0]);
      const g = parseInt(matches[1]);
      const b = parseInt(matches[2]);
      hexColor = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
    }
  }

  // 移除 # 号
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 计算亮度
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // 根据亮度返回黑色或白色
  return brightness > 128 ? '#000000' : '#ffffff';
}

export default Badge;
