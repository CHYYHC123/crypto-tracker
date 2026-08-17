import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { AssetItem } from '@/types/asset';
import type { AssetTypes } from '@/types/asset';
import { getCoinsFromStorage, setCoinsToStorage, getStocksList, setStocksList } from '@/utils/local';

/** Footer batchSelect prop 的类型，由 useBatchTokenSelect 构造后直接传入 */
export interface BatchSelectProps {
  showCheckboxes: boolean;
  enterSelectMode: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  handleToggleSelectAll: (checked: boolean) => void;
  selectedCount: number;
  handleCancelBatch: () => void;
  handleBatchDelete: () => void;
}

async function fetchList(mode: AssetTypes): Promise<string[]> {
  return mode === 'crypto'
    ? (await getCoinsFromStorage()) ?? []
    : (await getStocksList()) ?? [];
}

async function saveList(mode: AssetTypes, list: string[]): Promise<void> {
  return mode === 'crypto' ? setCoinsToStorage(list) : setStocksList(list);
}

interface Options {
  mode: AssetTypes;
  tokens: AssetItem[];
  setCountdown: (n: number) => void;
  mutate: () => Promise<any>;
}

// 批量删除资产
export function useBatchTokenSelect({ mode, tokens, setCountdown, mutate }: Options) {
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!showCheckboxes) {
      setSelectedTokens(new Set());
    }
  }, [showCheckboxes]);

  const isAllSelected = tokens.length > 0 && selectedTokens.size === tokens.length;
  const isIndeterminate = selectedTokens.size > 0 && selectedTokens.size < tokens.length;

  const enterSelectMode = () => setShowCheckboxes(true);

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTokens(new Set(tokens.map(token => token.symbol)));
    } else {
      setSelectedTokens(new Set());
    }
  };

  const handleToggleToken = (symbol: string, checked: boolean) => {
    const newSelected = new Set(selectedTokens);
    if (checked) {
      newSelected.add(symbol);
    } else {
      newSelected.delete(symbol);
    }
    setSelectedTokens(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selectedTokens.size === 0 || removing) return;
    const selectedCount = selectedTokens.size;
    if (tokens.length - selectedCount <= 0) {
      toast.error('At least one token must be kept', { duration: 2000 });
      return;
    }
    setRemoving(true);
    try {
      const oldList = await fetchList(mode);
      const newList = oldList.filter(symbol => !selectedTokens.has(symbol));
      await saveList(mode, newList);
      setSelectedTokens(new Set());
      setShowCheckboxes(false);
      setCountdown(10);
      setTimeout(() => {
        mutate();
        toast.success(`${selectedCount} token(s) have been removed`, { duration: 2000 });
      }, 1500);
    } catch {
      toast.error('Failed to remove tokens', { duration: 2000 });
    } finally {
      setRemoving(false);
    }
  };

  const handleCancelBatch = () => {
    setSelectedTokens(new Set());
    setShowCheckboxes(false);
  };

  const removeToken = async (symbol: string) => {
    if (!symbol || removing) return;
    setRemoving(true);
    try {
      const oldList = await fetchList(mode);
      if (!oldList?.includes(symbol)) return;
      if (oldList.length <= 1) {
        toast.loading('At least one token must be kept', { duration: 2000 });
        return;
      }
      const newList = oldList.filter(item => item !== symbol);
      await saveList(mode, newList);
      setCountdown(10);
      setTimeout(() => {
        mutate();
        toast.success(`${symbol} has been removed`, { duration: 2000 });
      }, 1500);
    } finally {
      setRemoving(false);
    }
  };

  const batchSelect: BatchSelectProps = {
    showCheckboxes,
    enterSelectMode,
    isAllSelected,
    isIndeterminate,
    handleToggleSelectAll,
    selectedCount: selectedTokens.size,
    handleCancelBatch,
    handleBatchDelete
  };

  return {
    batchSelect,
    selectedTokens,
    removing,
    handleToggleToken,
    removeToken
  };
}
