import { formatNumberWithCommas } from '@/utils/index';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/common/tooltip';
import { PriceAlert } from '@/types/index';

/**
 * 需求：
 * 这个组件主要是用来显示已经配置的预警价格，
 * 根据存储的 local 中的 price_alerts 进行渲染，字体颜色要引人注目一些
 * 其他要补充的你可以适当补充，但是要以我要求为主，不能有较大不同
 */
interface AlertBadgeProps {
  AlertInfo: PriceAlert | null;
}

const AlertBadge = ({ AlertInfo }: AlertBadgeProps) => {
  if (!AlertInfo) return null;

  const { direction, targetPrice } = AlertInfo;

  // 提示内容
  const tooltipContent = (
    <div className="flex flex-col gap-0.5">
      <div className="text-[12px] font-mono text-[gold]">🔔 Alert</div>
      <div className={`text-[10px] font-mono ${direction === 'above' ? 'text-emerald-300 text-cyan drop-shadow-[0_0_4px_rgba(110,231,183,0.5)]' : 'text-emerald-300 text-cyan-300 drop-shadow-[0_0_4px_rgba(252,165,165,0.5)]'}`}>
        {direction === 'above' ? 'Above' : 'Below'} ${formatNumberWithCommas(targetPrice)}
      </div>
    </div>
  );

  return (
    <div className={cn('flex items-center text-[12px] font-mono')}>
      <Tooltip content={tooltipContent} side="top" variant="default">
        <span className="text-[gold] cursor-pointer hover:opacity-80 transition-opacity" style={{fontSize: '12px'}}>🔔</span>
      </Tooltip>
    </div>
  );
};

export default AlertBadge;
