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

  const setAssetType = (type: AssetTypes) => {
    setLoading(true);
    setAssetTypeState(type);
    persistAssetType(type).then(() => {
      setTimeout(() => setLoading(false), 2000);
    });
  };

  return { assetType, loading, setAssetType };
}
