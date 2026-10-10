import { memo } from 'react';
import { ChartCandlestick } from 'lucide-react';
import type { AssetItem } from '@/types/asset';
import type { PriceAlert } from '@/types/index';
import AlertBadge from '@/popup/components/AlertBadge';
import { openAssetSidePanel } from '@/utils/openAssetSidePanel';

interface AssetSubInfoProps {
  coin: AssetItem;
  alert?: PriceAlert | null;
  onAlertClick?: () => void;
}

const AssetSubInfo = memo(({ coin, alert, onAlertClick }: AssetSubInfoProps) => {
  const handleOpenChart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    void openAssetSidePanel(coin);
  };

  return (
    <div className="flex items-center gap-1">
      {alert ? <AlertBadge AlertInfo={alert} onClick={onAlertClick} /> : null}
      <ChartCandlestick
        size={12}
        className="cursor-pointer hover:opacity-70 opacity-90 shrink-0"
        onClick={handleOpenChart}
      />
    </div>
  );
});

export default AssetSubInfo;
