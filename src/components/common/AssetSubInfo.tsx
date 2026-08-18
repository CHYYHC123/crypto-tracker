import { memo } from 'react';
import type { AssetItem } from '@/types/asset';
import type { PriceAlert } from '@/types/index';
import AlertBadge from '@/popup/components/AlertBadge';

interface AssetSubInfoProps {
  coin: AssetItem;
  alert?: PriceAlert | null;
  onAlertClick?: () => void;
}

const PHASE_MAP: Record<string, { label: string; className: string }> = {
  ON: { label: 'Open', className: '' },
  PRE: { label: 'Pre-Market', className: '' },
  POST: { label: 'After-Hours', className: '' },
  C: { label: 'Closed', className: '' }
};

const AssetSubInfo = memo(({ coin, alert, onAlertClick }: AssetSubInfoProps) => {
  if (coin.category === 'stocks') {
    const phase = PHASE_MAP[coin.marketPhase ?? 'C'] ?? PHASE_MAP['C'];
    return <div className="flex items-center gap-1">{alert ? <AlertBadge AlertInfo={alert} onClick={onAlertClick} /> : <span className={`text-[10px] opacity-60 font-mono ${phase.className}`}>{phase.label}</span>}</div>;
  }

  // crypto
  return alert ? <AlertBadge AlertInfo={alert} onClick={onAlertClick} /> : <div className="text-[10px] opacity-60">{coin.symbol}</div>;
});

export default AssetSubInfo;
