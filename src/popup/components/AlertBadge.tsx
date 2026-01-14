// 携带铃铛 🔔 
import { formatNumberWithCommas } from '@/utils/index';
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
        <span className="text-gray-500" style={{ fontSize: '12px', opacity: 0.5 }} onClick={onClick} title="Price alert disabled">
          🔕
        </span>
      </div>
    );
  }

  // 箭头 SVG
  const arrowIcon =
    direction === 'above' ? (
      <svg width="12" height="12" fill="none" stroke="#34d399" viewBox="0 0 24 24" style={{ marginRight: '4px' }}>
        <path d="M12 19V5M12 5l-4 4M12 5l4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <svg width="12" height="12" fill="none" stroke="#fda4af" viewBox="0 0 24 24" style={{ marginRight: '4px' }}>
        <path d="M12 5v14M12 19l-4-4M12 19l4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );

  // 提示内容
  const tooltipContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'gold' }}>🔔 Alert</div>
      <div
        style={{
          fontSize: '10px',
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          // 使用 Tailwind emerald-300 和 rose-300 的准确颜色值
          color: direction === 'above' ? '#34d399' : '#fda4af',
          textShadow: direction === 'above' ? '0 0 4px rgba(110,231,183,0.5)' : '0 0 4px rgba(253,164,175,0.5)'
        }}
      >
        {arrowIcon}
        {direction === 'above' ? 'Above' : 'Below'} ${formatNumberWithCommas(targetPrice)}
      </div>
    </div>
  );

  return (
    <div className={cn('flex items-center text-[12px] font-mono relative z-1')}>
      <Tooltip content={tooltipContent} side="top" variant="default">
        <span className="text-[gold] cursor-pointer hover:opacity-80 transition-opacity" style={{ fontSize: '12px' }} onClick={onClick}>
          🔔
        </span>
      </Tooltip>
    </div>
  );
};

export default AlertBadge;
