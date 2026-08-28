import { useState, useEffect } from 'react';
import type { AssetTypes } from '@/types/index';
import { getAssetType } from '@/utils/local';

/**
 * 只读版资产类型 hook，content script 与 popup 均可使用。
 * 与 src/popup/hooks/useAssetType.ts 的区别是不暴露 setAssetType。
 */
export function useCurrentAssetType(): AssetTypes {
  const [assetType, setAssetType] = useState<AssetTypes>('crypto');

  useEffect(() => {
    getAssetType().then(setAssetType);

    const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !changes.asset_type) return;
      const newValue = changes.asset_type.newValue as AssetTypes | undefined;
      if (newValue) setAssetType(newValue);
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  return assetType;
}
