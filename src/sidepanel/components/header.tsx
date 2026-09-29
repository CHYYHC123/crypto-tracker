import { TriangleIcon, ChevronLeft } from 'lucide-react';
import Logo from '@/components/common/logo';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onBack: () => void;
  className?: string;
}

const Header = ({ onBack, className }: HeaderProps) => {
  // mock 数据，后续替换为真实数据
  const symbol = 'AAPL';
  const name = 'Apple Inc.';
  const exchange = 'NASDAQ';
  const price = '$318.61';
  const change = 0.37;
  const isUp = change >= 0;

  return (
    <div className={cn('flex items-center justify-between p-3 pr-4 border-b border-border gap-1', className)}>
      {/* 左：返回按钮 */}
      <button className="p-1 rounded-md transition-opacity cursor-pointer hover:opacity-70 shrink-0">
        <ChevronLeft size={24} className="text-foreground" />
      </button>

      {/* 中：Logo + 名称 + 交易所标签 */}
      <div className="flex items-center gap-2 flex-1 min-w-0 mx-2">
        <div className="w-9 h-9 rounded-xl bg-foreground/20 flex items-center justify-center shrink-0 overflow-hidden">
          <Logo symbol={symbol} category="stocks" size="md" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground font-bold text-sm leading-none">{symbol}</span>
            <span className="text-[10px] font-medium text-foreground/60 bg-foreground/10 rounded px-1.5 py-0.5 leading-none">{exchange}</span>
          </div>
          <span className="text-foreground/50 text-xs mt-0.5 truncate">{name}</span>
        </div>
      </div>

      {/* 右：价格 + 涨跌幅 */}
      <div className="flex flex-col items-end shrink-0">
        <span className="text-foreground font-bold text-base leading-none tracking-wide">{price}</span>
        <div className={`flex items-center gap-0.5 mt-0.5 text-xs font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          <TriangleIcon size={8} className={`fill-current ${isUp ? '' : 'rotate-180'}`} />
          <span className="tracking-wide">{Math.abs(change).toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
