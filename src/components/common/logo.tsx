import { useState, memo } from 'react';
import type { AssetItem } from '@/types/asset';

type LogoPreset = 'sm' | 'md' | 'lg';

interface LogoProps {
  coin: AssetItem;
  /** 预设尺寸 'sm'|'md'|'lg'，或自定义 Tailwind class，如 "w-9 h-9 text-sm" */
  size?: LogoPreset | string;
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

const LetterLogo = memo(({ symbol, sizeClass }: { symbol: string; sizeClass: string }) => (
  <div className={`${sizeClass} flex items-center justify-center rounded-lg bg-white/10 font-medium`}>
    {symbol.charAt(0)}
  </div>
));

const Logo = memo(
  ({ coin, size = 'md' }: LogoProps) => {
    const [imgError, setImgError] = useState(false);
    const sizeClass = resolveSizeClass(size);

    if (coin.category === 'crypto' || imgError) {
      return <LetterLogo symbol={coin.symbol} sizeClass={sizeClass} />;
    }

    return (
      <img
        src={`${STOCK_LOGO_BASE}/${coin.symbol.toUpperCase()}.png`}
        alt={coin.symbol}
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-lg object-cover`}
        onError={() => setImgError(true)}
      />
    );
  },
  (prev, next) =>
    prev.coin.symbol === next.coin.symbol &&
    prev.coin.category === next.coin.category &&
    prev.size === next.size
);

export default Logo;
