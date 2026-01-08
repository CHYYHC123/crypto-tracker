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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'gold' }}>🔔 Alert</div>
      <div
        style={{
          fontSize: '10px',
          fontFamily: 'monospace',
          // 使用 Tailwind emerald-300 和 rose-300 的准确颜色值
          color: direction === 'above' ? '#34d399' : '#34d399',
          textShadow: direction === 'above' ? '0 0 4px rgba(110,231,183,0.5)' : '0 0 4px rgba(253,164,175,0.5)'
        }}
      >
        {direction === 'above' ? 'Above' : 'Below'} ${formatNumberWithCommas(targetPrice)}
      </div>
    </div>
  );

  return (
    <div className={cn('flex items-center text-[12px] font-mono relative z-10')}>
      <Tooltip content={tooltipContent} side="top" variant="default">
        <span className="text-[gold] cursor-pointer hover:opacity-80 transition-opacity" style={{ fontSize: '12px' }}>
          🔔
        </span>
      </Tooltip>
    </div>
  );
};

export default AlertBadge;
