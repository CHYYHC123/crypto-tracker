import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import type { AssetTypes } from '@/types/asset';
import { getCoinsFromStorage, setCoinsToStorage, getStocksList, setStocksList } from '@/utils/local';

/**
 * 添加资产
 * @param mode 资产类型 'crypto' | 'stocks'
 * @param onAdded 添加成功回调
*/
export function useAddAsset(mode: AssetTypes, onAdded?: () => void) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('translation', { keyPrefix: 'popup.home.addAsset' });

  const addCrypto = async (symbol: string): Promise<boolean> => {
    // getCoinsFromStorage 已归一化，所有元素均为 CoinRecord 对象
    const old = (await getCoinsFromStorage()) ?? [];
    if (old.some(c => c.symbol === symbol)) {
      toast(t('tokenAlreadyExists'), { duration: 2000, id: 'asset-already-exists' });
      return false;
    }
    await setCoinsToStorage([...old, { symbol }]);
    setTimeout(() => {
      onAdded?.();
      toast.success(t('tokenAdded'), { duration: 2000, id: 'asset-added' });
    }, 1500);
    return true;
  };

  const addStock = async (symbol: string): Promise<boolean> => {
    const old = (await getStocksList()) ?? [];
    if (old.includes(symbol)) {
      toast(t('stockAlreadyExists'), { duration: 2000, id: 'asset-already-exists' });
      return false;
    }
    await setStocksList([...old, symbol]);
    setTimeout(() => {
      onAdded?.();
      toast.success(t('stockAdded'), { duration: 2000, id: 'asset-added' });
    }, 1500);
    return true;
  };

  const saveAsset = async (symbol: string): Promise<boolean> => {
    setLoading(true);
    try {
      return mode === 'crypto' ? await addCrypto(symbol) : await addStock(symbol);
    } catch {
      toast.error(t('failed'), { duration: 2000, id: 'asset-add-failed' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { saveAsset, loading };
}
