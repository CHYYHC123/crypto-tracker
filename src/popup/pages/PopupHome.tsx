import { useState } from 'react';
import { usePriceFetcher } from '@/popup/hooks/usePriceFetcher';
import toast from 'react-hot-toast';

// @ts-ignore
import ActionMenu from '@/components/common/ActionMenu';
import ActionMenuItem from '@/components/common/ActionMenuItem';

import { Header } from '@/popup/components/Header';
import { TokenSearch } from '@/popup/components/TokenSearch';
import { EmptyState } from '@/popup/components/EmptyState';
import { Footer } from '@/popup/components/Footer';

import type { AssetItem } from '@/types/asset';

import { useBatchTokenSelect } from '@/popup/hooks/useBatchTokenSelect';
import { usePriceAlerts } from '@/popup/hooks/usePriceAlerts';
import { useAutoScroll } from '@/popup/hooks/useAutoScroll';
import { useAssetType } from '@/popup/hooks/useAssetType';
import { useSkeletonLoading } from '@/popup/hooks/useSkeletonLoading';

import AssetSubItem from '@/popup/components/PopupHome/AssetItem';
import CheckBox from '@/popup/components/PopupHome/Checkbox';
import AlertDialog from '@/popup/components/PopupHome/AlertDialog';
import AssetListSkeleton from '@/popup/components/AssetListSkeleton';

export default function PopupContent() {
  const { assetType: modeType, loading: assetTypeInitLoading } = useAssetType();

  // 价格预警 hooks
  const { priceAlerts } = usePriceAlerts();

  const { tokens, countdown, setCountdown, isLoading, mutate } = usePriceFetcher();

  // 批量删除币种 hooks
  const { batchSelect, selectedTokens, removing, handleToggleToken, removeToken } = useBatchTokenSelect({
    mode: modeType,
    tokens,
    setCountdown,
    mutate
  });

  // 骨架屏 loading（切换类型 / 删除 / 新增）
  const { skeletonLoading } = useSkeletonLoading({
    modeType,
    assetTypeInitLoading,
    tokens,
    removing,
    mutate
  });

  // 添加币种后自动滚动到底部
  const listRef = useAutoScroll(tokens);

  // Token 添加成功后的回调
  const handleTokenAdded = () => {
    setCountdown(10);
    mutate();
  };

  // 手动刷新
  const refreshData = () => {
    setCountdown(10);
    chrome.runtime.sendMessage({ type: 'REFRESH', payload: { falg: true } }, async response => {
      const toastType = response.success ? 'success' : 'error';
      toast[toastType](response?.msg, { duration: 2000 });
    });
  };

  // ActionMenu 状态
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const [menuToken, setMenuToken] = useState<AssetItem | null>(null);

  const handleOpen = (e: React.MouseEvent<HTMLElement>, tokenItme: AssetItem) => {
    if (removing) return;
    setAnchorEl(e.currentTarget);
    setMenuToken(tokenItme);
  };

  // 关闭时重置样式，确保下次打开时重新计算
  const handleClose = () => {
    setAnchorEl(null);
    setMenuToken(null);
  };

  // 设置预警价格
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [alertToken, setAlertToken] = useState<AssetItem | null>(null);

  const setPriceAlert = () => {
    if (!menuToken) return;
    setAlertToken(menuToken);
    setShowPriceAlert(true);
    handleClose();
  };

  // 点击 AlertBadge 唤起弹窗
  const handleAlertBadgeClick = (token: AssetItem) => {
    setAlertToken(token);
    setShowPriceAlert(true);
  };

  return (
    <>
      <div className="w-full h-full font-mono bg-gray-900 text-white shadow-2xl backdrop-blur-lg p-3 flex flex-col">
        <Header />

        <TokenSearch mode={modeType} tokens={tokens} onTokenAdded={handleTokenAdded} />

        {skeletonLoading ? (
          <AssetListSkeleton count={5} />
        ) : (
          <div ref={listRef} className="mt-5 overflow-auto flex-1 scrollbar-hide relative">
            {Array.isArray(tokens) && tokens.length > 0 ? (
              tokens.map((item: AssetItem) => {
                // 查找该币种对应的预警
                const alert = priceAlerts.find(a => a.symbol.toUpperCase() === item.symbol.toUpperCase());
                return (
                  <div key={item.id} className="flex items-center">
                    <CheckBox visible={batchSelect.showCheckboxes} checked={selectedTokens.has(item.symbol)} onChange={checked => handleToggleToken(item.symbol, checked)} />

                    <AssetSubItem removing={removing} dataInfo={item} alertInfo={alert} onAlertClick={handleAlertBadgeClick} onMenuClick={handleOpen} />
                  </div>
                );
              })
            ) : (
              <EmptyState />
            )}
          </div>
        )}

        <Footer isLoading={isLoading} countdown={countdown} onRefresh={refreshData} batchSelect={batchSelect} />
      </div>

      {/* ActionMenu - 移到最外层 div 外面，避免影响父容器布局 */}
      <ActionMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <ActionMenuItem onClick={setPriceAlert}>Price Alert</ActionMenuItem>
        <ActionMenuItem
          danger
          onClick={() => {
            if (menuToken?.symbol) removeToken(menuToken?.symbol);
            handleClose();
          }}
        >
          Remove
        </ActionMenuItem>
      </ActionMenu>

      {/* 设计币种价格预警弹窗 */}
      <AlertDialog open={showPriceAlert} token={alertToken} onClose={() => setShowPriceAlert(false)} />
    </>
  );
}
