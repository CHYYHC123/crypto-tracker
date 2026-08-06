import { useState, useEffect } from 'react';
import type { AssetTypes } from '@/types/index';

interface UseAssetType {
  assetType: AssetTypes;
  loading: boolean;
  setAssetType: (type: AssetTypes) => void;
}

// 切换资产类型 hooks
export function useAssetType(): UseAssetType {
  const [assetType, setAssetTypeState] = useState<AssetTypes>('crypto');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get('asset_type', res => {
      const stored = res.asset_type as AssetTypes;
      if (['crypto', 'stocks'].includes(stored)) {
        setAssetTypeState(stored);
      }
      setLoading(false);
    });
  }, []);

  const setAssetType = (type: AssetTypes) => {
    setLoading(true);
    setAssetTypeState(type);
    chrome.storage.local.set({ asset_type: type }, () => {
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    });
  };

  return { assetType, loading, setAssetType };
}
