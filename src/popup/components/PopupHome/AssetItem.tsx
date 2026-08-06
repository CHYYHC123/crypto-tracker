import { motion } from 'framer-motion';
import type { TokenItem, PriceAlert } from '@/types/index';
import { Ellipsis } from 'lucide-react';

// import { cn } from '@/lib/utils';
import { formatNumberWithCommas } from '@/utils/index';

import AlertBadge from '@/popup/components/AlertBadge';

interface AssetItemProps {
  className?: string;
  removing: boolean;
  dataInfo: TokenItem;
  alertInfo?: PriceAlert;
  onAlertClick?: (token: TokenItem) => void;
  onMenuClick: (e: React.MouseEvent<HTMLElement>, token: TokenItem) => void;
}

// 获取变化颜色
const getChangeColor = (change?: number | null): string => {
  if (change == null) return '#999';
  return change >= 0 ? '#16a34a' : '#ef4444';
};

// 格式化变化百分比
const formatChange = (change?: number | null): string => {
  if (change == null) return '—';
  const prefix = change >= 0 ? '+' : '';
  return `${prefix}${change}%`;
};

// 格式化价格
const formatPrice = (price?: number | null): string => {
  if (price == null) return '-';
  return formatNumberWithCommas(price);
};

const AssetItem: React.FC<AssetItemProps> = ({ removing, dataInfo, alertInfo, onAlertClick, onMenuClick }) => {
  const chColor = getChangeColor(dataInfo?.change);
  // 查找该币种对应的预警
  //  const alert = priceAlerts.find(a => a.symbol.toUpperCase() === item.symbol.toUpperCase());

  return (
    <motion.div layout whileHover={{ scale: 1 }} className="grid grid-cols-[auto_1fr_auto] items-center p-2 box-border rounded-xl mb-1.5 bg-white/5 hover:bg-white/10 cursor-pointer transition flex-1 min-w-0" transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], layout: { duration: 0.3 } }}>
      <div className="flex items-center">
        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-base font-medium">{dataInfo?.icon}</div>
        <div className="ml-2 min-w-15">
          <div className="text-[13px] font-bold">{dataInfo?.symbol}</div>
          {alertInfo ? <AlertBadge AlertInfo={alertInfo} onClick={() => onAlertClick?.(dataInfo)} /> : <div className="text-[11px] font-mono text-[#9ca3af]">{dataInfo.id}</div>}
        </div>
      </div>
      <div className="text-left ml-5">
        <div className="font-semibold text-sm">{formatPrice(dataInfo.price)}</div>
        <div className="text-[11px]" style={{ color: chColor }}>
          {formatChange(dataInfo?.change)}
        </div>
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
