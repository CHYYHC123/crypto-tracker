import { DataStatus } from '@/types/index';
import { cn } from '@/lib/utils';

interface NetworkStateProps {
  status: DataStatus;
  className?: string;
}

const STATUS_MAP: Record<
  DataStatus,
  {
    label: string;
    className: string;
    animate?: string;
  }
> = {
  [DataStatus.LIVE]: {
    label: 'LIVE',
    className: 'text-success bg-success-bg',
    animate: 'pulse'
  },
  [DataStatus.DEGRADED]: {
    label: 'DEGRADED',
    className: 'text-warning bg-warning/15'
  },
  [DataStatus.OFFLINE]: {
    label: 'OFFLINE',
    className: 'text-danger bg-danger/15'
  }
};

const NetworkState = ({ status, className }: NetworkStateProps) => {
  const { label, className: statusClass, animate } = STATUS_MAP[status];

  return (
    <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg', statusClass, animate === 'pulse' && 'animate-pulse', className)}>
      <span className="shrink-0 w-2 h-2 rounded-full mr-1 bg-current shadow-[0_0_6px_currentColor]" />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
  );
};

export default NetworkState;
