// 携带铃铛 🔔
import { formatNumWithCommas } from '@/utils/index';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/common/tooltip';
import { PriceAlert } from '@/types/index';

interface AlertBadgeProps {
  AlertInfo: PriceAlert | null;
  onClick?: () => void;
}

const AlertBadge = ({ AlertInfo, onClick }: AlertBadgeProps) => {
  if (!AlertInfo) return null;

  const { direction, targetPrice, enabled } = AlertInfo;

  // 如果禁用，显示 bell-off 图标，不显示 tooltip
  if (!enabled) {
    return (
      <div className={cn('flex items-center text-[12px] font-mono relative z-10')}>
        <span className="text-muted cursor-pointer" style={{ fontSize: '12px', opacity: 0.5 }} onClick={onClick} title="Price alert disabled">
          🔕
        </span>
      </div>
    );
  }

  const isAbove = direction === 'above';

  const arrowIcon = (
    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="mr-1">
      {isAbove ? (
        <path d="M12 19V5M12 5l-4 4M12 5l4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M12 5v14M12 19l-4-4M12 19l4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );

  const tooltipContent = (
    <div className="flex flex-col gap-0.5 font-mono">
      <div className="text-xs text-warning">🔔 Alert</div>
      <div className={cn('text-[10px] flex items-center', isAbove ? 'text-success' : 'text-danger')}>
        {arrowIcon}
        {isAbove ? 'Above' : 'Below'} ${formatNumWithCommas(targetPrice)}
      </div>
    </div>
  );

  return (
    <div className={cn('flex items-center text-[12px] font-mono relative z-1')}>
      <Tooltip content={tooltipContent} side="top" variant="default">
        <span className="text-warning cursor-pointer hover:opacity-80 transition-opacity text-xs" onClick={onClick}>
          🔔
        </span>
      </Tooltip>
    </div>
  );
};

export default AlertBadge;
