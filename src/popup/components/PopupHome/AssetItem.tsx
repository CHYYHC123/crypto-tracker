import { motion } from 'framer-motion';
import type { AssetItem as AssetItemType } from '@/types/asset';
import type { PriceAlert } from '@/types/index';
import { Ellipsis } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatNumWithCommas, formatChange, getChangeColorClass } from '@/utils/index';

import Logo from '@/components/common/logo';
import AssetSubInfo from '@/components/common/AssetSubInfo';

interface AssetItemProps {
  className?: string;
  removing: boolean;
  dataInfo: AssetItemType;
  alertInfo?: PriceAlert;
  onAlertClick?: (token: AssetItemType) => void;
  onMenuClick: (e: React.MouseEvent<HTMLElement>, token: AssetItemType) => void;
}

// 格式化价格
const formatPrice = (price?: number | null): string => {
  if (price == null) return '-';
  return formatNumWithCommas(price);
};

const AssetItem: React.FC<AssetItemProps> = ({ removing, dataInfo, alertInfo, onAlertClick, onMenuClick }) => {
  return (
    <motion.div layout whileHover={{ scale: 1 }} className="grid grid-cols-[auto_1fr_auto] items-center p-2 box-border rounded-xl mb-1.5 bg-white/5 hover:bg-white/10 cursor-pointer transition flex-1 min-w-0" transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], layout: { duration: 0.3 } }}>
      <div className="flex items-center">
        <Logo size="w-9 h-9 text-sm" coin={dataInfo} />

        <div className="ml-2 min-w-15">
          <div className="text-[13px] font-bold">{dataInfo?.symbol}</div>
          <AssetSubInfo coin={dataInfo} alert={alertInfo} onAlertClick={() => onAlertClick?.(dataInfo)} />
        </div>
      </div>
      <div className={cn('text-left ml-10')}>
        <div className="font-semibold text-sm">{formatPrice(dataInfo.price)}</div>
        <div className={`text-[11px] ${getChangeColorClass(dataInfo?.change)}`}>{formatChange(dataInfo?.change)}</div>
      </div>

      <div className="justify-self-end">
        <button disabled={removing} onClick={e => onMenuClick(e, dataInfo)} className="px-2 py-1 rounded-md hover:bg-white/10 transition cursor-pointer disabled:opacity-50">
          <Ellipsis size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default AssetItem;
