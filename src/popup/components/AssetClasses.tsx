import { useState, useEffect } from 'react';
import { ChevronDown, Coins, ChartLineIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useTranslation } from 'react-i18next';

import ActionMenu from '@/components/common/ActionMenu';
import ActionMenuItem from '@/components/common/ActionMenuItem';

import NewFlag from '@/popup/components/header/new';

import { useAssetType } from '@/popup/hooks/useAssetType';
import type { AssetTypes } from '@/types/index';
import { getAssetTypeSwitched, setAssetTypeSwitched } from '@/utils/local';

// 资产类型切换弹出
const AssetClasses = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'popup.home.header' });

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // 初始切换资产类型 hooks
  const { assetType, setAssetType } = useAssetType();

  // 是否已手动切换过资产类型（控制 NEW 标志显示）
  const [hasSwitched, setHasSwitched] = useState(false);
  useEffect(() => {
    getAssetTypeSwitched().then(v => {
      if (v) setHasSwitched(true);
    });
  }, []);

  const handleDataSource = (type: AssetTypes) => {
    setAssetType(type);
    setAnchorEl(null);
    if (!hasSwitched) {
      setHasSwitched(true);
      setAssetTypeSwitched();
    }
  };

  return (
    <div className="relative">
      <button onClick={handleOpen} className="group flex items-center gap-2 py-1.5 px-2.5 rounded-xl border border-border bg-background text-[12px] cursor-pointer text-foreground hover:text-foreground-bold hover:border-foreground/40 transition-all duration-200">
        <span className="text-foreground group-hover:text-foreground-bold transition-colors duration-200">{assetType === 'crypto' ? t('crypto') : t('stocks')}</span>

        <ChevronDown className={cn('w-4 h-4 text-foreground group-hover:text-foreground-bold transition-all duration-200', open && 'rotate-180')} />

        {!hasSwitched && <NewFlag className="absolute -bottom-1 -right-2" />}
      </button>

      <ActionMenu anchorEl={anchorEl} open={open} onClose={handleClose} className="mt-2 min-w-35 rounded-xl border border-border bg-background/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] p-1">
        <ActionMenuItem onClick={() => handleDataSource('crypto')}>
          <div className="flex items-center justify-between">
            <div className={cn('flex items-center gap-1.5', assetType === 'crypto' ? 'text-foreground-bold' : 'text-muted')}>
              <Coins className="w-4 h-4" />
              <span>{t('crypto')}</span>
            </div>
            {assetType === 'crypto' && <Check className="w-4 h-4 text-primary" />}
          </div>
        </ActionMenuItem>

        <ActionMenuItem onClick={() => handleDataSource('stocks')}>
          <div className="flex items-center justify-between">
            <div className={cn('flex items-center gap-1.5', assetType === 'stocks' ? 'text-foreground-bold' : 'text-muted')}>
              <ChartLineIcon className="w-4 h-4" />
              <span>{t('stocks')}</span>
            </div>
            {assetType === 'stocks' && <Check className="w-4 h-4 text-primary" />}
          </div>
        </ActionMenuItem>
      </ActionMenu>
    </div>
  );
};

export default AssetClasses;
