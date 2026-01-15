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
    textColor: string;
    dotColor: string;
    dotShadow: string;
    bgColor: string;
    animate?: string;
  }
> = {
  [DataStatus.LIVE]: {
    label: 'LIVE',
    textColor: '#34d399', // emerald-400
    dotColor: '#34d399',
    dotShadow: '0 0 6px rgba(52, 211, 153, 0.8)',
    bgColor: 'rgba(92, 165, 138, 0.3)', // gray-800 with 90% opacity
    animate: 'pulse'
  },
  [DataStatus.DEGRADED]: {
    label: 'DEGRADED',
    textColor: '#facc15', // yellow-400
    dotColor: '#facc15',
    dotShadow: '0 0 6px rgba(250, 204, 21, 0.8)',
    bgColor: 'rgba(54, 50, 46, 1)'
  },
  [DataStatus.OFFLINE]: {
    label: 'OFFLINE',
    textColor: '#fb7185', // rose-400
    dotColor: '#fb7185',
    dotShadow: '0 0 6px rgba(251, 113, 133, 0.8)',
    bgColor: 'rgba(43, 35, 46, 1)'
  }
};

const NetworkState = ({ status, className }: NetworkStateProps) => {
  const { label, textColor, dotColor, dotShadow, bgColor, animate } = STATUS_MAP[status];

  return (
    <div
      className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg', animate === 'pulse' && 'animate-pulse', className)}
      style={{
        backgroundColor: bgColor,
        color: textColor
      }}
    >
      <span
        className="flex-shrink-0"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          boxShadow: dotShadow,
          marginRight: '4px'
        }}
      />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
  );
};

export default NetworkState;
