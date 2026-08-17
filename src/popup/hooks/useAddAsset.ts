import { useState } from 'react';
import toast from 'react-hot-toast';

import type { AssetTypes } from '@/types/asset';
import { getCoinsFromStorage, setCoinsToStorage, getStocksList, setStocksList } from '@/utils/local';

async function addCrypto(symbol: string, onAdded?: () => void): Promise<boolean> {
  const old = (await getCoinsFromStorage()) ?? [];
  if (old.includes(symbol)) {
    toast('Token already exists ⚠️', { duration: 2000, id: 'asset-already-exists' });
    return false;
  }
  await setCoinsToStorage([...old, symbol]);
  setTimeout(() => {
    onAdded?.();
    toast.success('Token added successfully', { duration: 2000, id: 'asset-added' });
  }, 1500);
  return true;
}

async function addStock(symbol: string, onAdded?: () => void): Promise<boolean> {
  const old = (await getStocksList()) ?? [];
  if (old.includes(symbol)) {
    toast('Stock already exists ⚠️', { duration: 2000, id: 'asset-already-exists' });
    return false;
  }
  await setStocksList([...old, symbol]);
  setTimeout(() => {
    onAdded?.();
    toast.success('Stock added successfully', { duration: 2000, id: 'asset-added' });
  }, 1500);
  return true;
}

/**
 * 添加资产
 * @param mode 资产类型 'crypto' | 'stocks'
 * @param onAdded 添加成功回调
*/
export function useAddAsset(mode: AssetTypes, onAdded?: () => void) {
  const [loading, setLoading] = useState(false);

  const saveAsset = async (symbol: string): Promise<boolean> => {
    setLoading(true);
    try {
      return mode === 'crypto' ? await addCrypto(symbol, onAdded) : await addStock(symbol, onAdded);
    } catch {
      toast.error('Failed to add asset', { duration: 2000, id: 'asset-add-failed' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { saveAsset, loading };
}
