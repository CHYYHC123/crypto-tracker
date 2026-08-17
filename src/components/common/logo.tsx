import { useState, memo } from 'react';
import { cn } from '@/lib/utils';
import type { AssetCategory } from '@/types/asset';

type LogoPreset = 'sm' | 'md' | 'lg';

interface LogoProps {
  symbol: string;
  category: AssetCategory;
  size?: LogoPreset | string;
  rounded?: string;
}

const STOCK_LOGO_BASE = 'https://bin.bnbstatic.com/static/stock';

const PRESET_CLASS: Record<LogoPreset, string> = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-base',
  lg: 'w-10 h-10 text-lg',
};

function resolveSizeClass(size: LogoPreset | string = 'md'): string {
  return size in PRESET_CLASS ? PRESET_CLASS[size as LogoPreset] : size;
}

const LetterLogo = memo(({ symbol, sizeClass, rounded }: { symbol: string; sizeClass: string; rounded: string }) => (
  <div className={cn(sizeClass, rounded, 'flex items-center justify-center bg-white/10 font-medium')}>
    {symbol.charAt(0)}
  </div>
));

const Logo = memo(
  ({ symbol, category, size = 'md', rounded = 'rounded-lg' }: LogoProps) => {
    const [imgError, setImgError] = useState(false);
    const sizeClass = resolveSizeClass(size);

    if (category === 'crypto' || imgError) {
      return <LetterLogo symbol={symbol} sizeClass={sizeClass} rounded={rounded} />;
    }

    return (
      <img
        src={`${STOCK_LOGO_BASE}/${symbol.toUpperCase()}.png`}
        alt={symbol}
        referrerPolicy="no-referrer"
        className={cn(sizeClass, rounded, 'object-cover')}
        onError={() => setImgError(true)}
      />
    );
  },
  (prev, next) =>
    prev.symbol === next.symbol &&
    prev.category === next.category &&
    prev.size === next.size &&
    prev.rounded === next.rounded
);

export default Logo;
