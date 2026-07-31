import { useState } from 'react';
import { ChevronDown, Coins, ChartLineIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

import ActionMenu from '@/components/common/ActionMenu';
import ActionMenuItem from '@/components/common/ActionMenuItem';

type AssetTypes = 'crypto' | 'stocks';

const AssetClasses = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // 选择资产类型
  const [assetType, setAssetType] = useState<AssetTypes>('crypto');
  const handleDataSource = (type: AssetTypes) => {
    setAssetType(type);
    setAnchorEl(null);
  };
  return (
    <div className="relative">
      {/* Trigger */}
      <button onClick={handleOpen} className="group flex items-center gap-2 py-1.5 px-2.5 rounded-xl border border-white/20 bg-[#0f172a] text-[12px] cursor-pointer text-white/75 hover:text-white hover:border-white/40 transition-all duration-200">
        <span className="text-white/75 group-hover:text-white transition-colors duration-200">{assetType === 'crypto' ? 'Crypto' : 'Stocks'}</span>

        <ChevronDown className={cn('w-4 h-4 text-white/75 group-hover:text-white transition-all duration-200', open && 'rotate-180')} />
      </button>

      <ActionMenu anchorEl={anchorEl} open={open} onClose={handleClose} className="mt-2 min-w-35 rounded-xl border border-white/8 bg-[#111827]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] p-1">
        <ActionMenuItem onClick={() => handleDataSource('crypto')}>
          <div className="flex items-center justify-between">
            <div className={cn('flex items-center gap-1.5', assetType === 'crypto' ? 'text-white' : 'text-white/50')}>
              <Coins className="w-4 h-4" />
              <span>Crypto</span>
            </div>
            {assetType === 'crypto' && <Check className="w-4 h-4 text-purple-500" />}
          </div>
        </ActionMenuItem>

        <ActionMenuItem onClick={() => handleDataSource('stocks')}>
          <div className="flex items-center justify-between">
            <div className={cn('flex items-center gap-1.5', assetType === 'stocks' ? 'text-white' : 'text-white/50')}>
              <ChartLineIcon className="w-4 h-4" />
              <span>Stocks</span>
            </div>
            {assetType === 'stocks' && <Check className="w-4 h-4 text-purple-500" />}
          </div>
        </ActionMenuItem>
      </ActionMenu>
    </div>
  );
};

export default AssetClasses;
