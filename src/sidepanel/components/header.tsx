import { TriangleIcon, ChevronLeft } from 'lucide-react';
import Logo from '@/components/common/logo';
import { cn } from '@/lib/utils';

interface HeaderProps {
  symbol: string;
  /** 币种全名，如 "Bitcoin" */
  name?: string;
  /** 交易所展示名，如 "Binance" */
  exchange?: string;
  /** 已格式化的价格字符串，如 "96,234.56" */
  price?: string;
  /** 涨跌幅数值（百分比），如 2.31 或 -1.05 */
  change?: number;
  className?: string;
}

const Header = ({ symbol, name, exchange, price, change, className }: HeaderProps) => {
  const isUp = (change ?? 0) >= 0;

  return (
    <div className={cn('flex items-center justify-between p-3 pr-4 border-b border-border gap-1', className)}>
      {/* 左：返回按钮 */}
      <button onClick={() => window.close()} className="p-1 rounded-md transition-opacity cursor-pointer hover:opacity-70 shrink-0">
        <ChevronLeft size={24} className="text-foreground" />
      </button>

      {/* 中：Logo + 名称 + 交易所标签  */}
      <div className="flex items-center gap-2 flex-1 min-w-0 mx-2">
        <div className="w-9 h-9 rounded-xl bg-foreground/20 flex items-center justify-center shrink-0 overflow-hidden">
          <Logo symbol={symbol} category="crypto" size="md" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground font-bold text-sm leading-none">{symbol}</span>
            {exchange && <span className="text-[10px] font-medium text-foreground/60 bg-foreground/10 rounded px-1.5 py-0.5 leading-none">{exchange}</span>}
          </div>
          {name && <span className="text-foreground/50 text-xs mt-0.5 truncate">{name}</span>}
        </div>
      </div>

      {/* 右：价格 + 涨跌幅 */}
      <div className="flex flex-col items-end shrink-0">
        <span className="text-foreground font-bold text-base leading-none tracking-wide">{price ?? '--'}</span>
        {change != null && (
          <div className={`flex items-center gap-0.5 mt-0.5 text-xs font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            <TriangleIcon size={8} className={`fill-current ${isUp ? '' : 'rotate-180'}`} />
            <span className="tracking-wide">{change.toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
