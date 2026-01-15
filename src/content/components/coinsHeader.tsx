import { memo, useMemo } from 'react';
import { Plus, Minus } from 'lucide-react';
import { DataStatus } from '@/types/index';
import NetworkState from '@/content/components/networkState';
import { formatNumberWithCommas } from '@/utils/index';
import { PriceAlert, TokenItem } from '@/types/index';
import AlertBadge from '@/popup/components/AlertBadge';

// 头部组件
interface CoinsHeaderProps {
  /** 网络状态 */
  status: DataStatus;

  /** 展开收起 */
  collapsed: boolean;
  onToggle: () => void;

  /** 显示的 token  */
  displayToken: TokenItem | null;

  /** 价格预警 */
  priceAlerts: PriceAlert[];

  /** 刷新数据回调 */
  onRefresh: () => void;
}

export const CoinsHeader = memo(({ status, collapsed, displayToken, priceAlerts, onToggle, onRefresh }: CoinsHeaderProps) => {
  // 查找当前 token 的预警信息
  const currentAlert = useMemo(() => {
    if (!displayToken) return null;
    return priceAlerts.find(a => a.symbol.toUpperCase() === displayToken.symbol.toUpperCase()) || null;
  }, [displayToken, priceAlerts]);

  // 格式化涨跌幅显示
  const changeDisplay = useMemo(() => {
    if (!displayToken?.change) return null;
    const change = displayToken.change;
    const isPositive = change >= 0;
    return {
      text: `${isPositive ? '+' : ''}${change}%`,
      className: isPositive ? 'text-emerald-400' : 'text-rose-400'
    };
  }, [displayToken?.change]);

  return (
    <div className="flex justify-between items-center p-3 cursor-move bg-gray-900 backdrop-blur-lg z-10">
      {collapsed && displayToken ? (
        <div className="flex items-center justify-between w-full ">
          <div className="flex items-center">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-base font-medium">{displayToken.icon}</div>
            <div className="ml-2">
              <div className="text-xs font-medium">{displayToken.symbol}</div>
              {currentAlert ? <AlertBadge AlertInfo={currentAlert} /> : <div className="text-[10px] opacity-60">{displayToken.id}</div>}
            </div>
          </div>

          {status !== DataStatus.LIVE ? (
            <div className="mr-3" onClick={onRefresh}>
              <NetworkState status={status} className="cursor-pointer" />
            </div>
          ) : (
            <div className="mr-3 text-right">
              {displayToken.price && <div className="text-xs font-semibold">{formatNumberWithCommas(displayToken.price)}</div>}
              {changeDisplay && <div className={`text-[10px] ${changeDisplay.className}`}>{changeDisplay.text}</div>}
            </div>
          )}
        </div>
      ) : (
        <h2 className="text-sm font-semibold text-sans">Crypto Prices</h2>
      )}

      <div className="flex gap-2 items-center ml-2">
        <button onClick={onToggle} className="text-xs px-1 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer" aria-label={collapsed ? '展开' : '收起'}>
          {collapsed ? <Plus size={12} /> : <Minus size={12} />}
        </button>
      </div>
    </div>
  );
});

CoinsHeader.displayName = 'CoinsHeader';
