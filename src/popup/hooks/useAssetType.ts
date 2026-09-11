import { useState, useEffect } from 'react';
import type { AssetTypes } from '@/types/index';
import { getAssetType, setAssetType as persistAssetType } from '@/utils/local';

interface UseAssetType {
  assetType: AssetTypes;
  loading: boolean;
  setAssetType: (type: AssetTypes) => void;
}

export function useAssetType(): UseAssetType {
  const [assetType, setAssetTypeState] = useState<AssetTypes>('crypto');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssetType().then(type => {
      setAssetTypeState(type ?? 'crypto');
      setLoading(false);
    });
  }, []);

  // 监听 storage 变化，同步其他组件实例写入的 asset_type
  useEffect(() => {
    const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !changes.asset_type) return;
      const newType = changes.asset_type.newValue as AssetTypes | undefined;
      if (newType) setAssetTypeState(newType);
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  const setAssetType = (type: AssetTypes) => {
    setLoading(true);
    setAssetTypeState(type);
    persistAssetType(type);
  };

  return { assetType, loading, setAssetType };
}
