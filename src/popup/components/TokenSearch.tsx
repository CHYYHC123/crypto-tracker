import type { KeyboardEvent } from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

import SearchInput from '@/components/common/SearchInput';
import PopularSuggestions from '@/popup/components/search/PopularSuggestions';
import DialogHeader from '@/popup/components/search/DialogHeader';
import { TokenList } from '@/popup/components/search/TokenList';

import { useSymbolList } from '@/popup/hooks/useSymbolList';

import Input from '@/components/common/input';
import Button from '@/components/common/button';
import Dialog from '@/components/common/dialog';

import type { AssetItem } from '@/types/asset';
import { POPULAR_TOKENS } from '@/config/exchangeConfig';
import { POPULAR_STOCKS } from '@/config/stocks';
import type { AssetTypes } from '@/types/index';
import { sanitizeSymbolInput } from '@/utils/index';
import { validateCount } from '@/popup/utils/validateCount';

const MODE_CONFIG: Record<AssetTypes, { dialogTitle: string; placeholder: string; popularItems: readonly string[] | string[]; suffix: string }> = {
  crypto: {
    dialogTitle: 'Add Crypto',
    placeholder: 'Search Symbol (e.g. BTC)',
    popularItems: POPULAR_TOKENS,
    suffix: '/USDT'
  },
  stocks: {
    dialogTitle: 'Add Stock',
    placeholder: 'Search Symbol (e.g. AAPL)',
    popularItems: POPULAR_STOCKS,
    suffix: ''
  }
};


async function getCoins(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'GET_COINS' }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      response?.success ? resolve(response.data) : reject(new Error(response?.error || 'Failed to get coins'));
    });
  });
}

async function setCoins(coins: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'SET_COINS', payload: { coins } }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      response?.success ? resolve() : reject(new Error(response?.error || 'Failed to set coins'));
    });
  });
}

interface TokenSearchProps {
  tokens: AssetItem[];
  onTokenAdded?: () => void;
  mode?: AssetTypes;
}

// TokenSearch
export const TokenSearch = ({ tokens, onTokenAdded, mode = 'crypto' }: TokenSearchProps) => {
  const config = MODE_CONFIG[mode];
  const [loading, setLoading] = useState(false);

  // "Add crypto" 弹窗
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 已添加的 symbol 集合（O(1) 查找）
  const addedSet = useMemo(() => new Set(tokens?.map(t => t.symbol) ?? []), [tokens]);

  // 打开弹窗
  const openAddDialog = async () => {
    const canAdd = await validateCount(tokens);
    if (!canAdd) {
      toast.error('Max tracked cryptos reached. Contact admin to unlock.');
      return;
    }
    setSearchVal('');
    setShowAddDialog(true);
  };

  // 弹窗打开后聚焦搜索框
  useEffect(() => {
    if (showAddDialog) {
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [showAddDialog]);

  const { symbolList: dialogTokenList } = useSymbolList({ mode, searchVal });

  //  通用保存逻辑
  const saveToken = async (symbol: string): Promise<boolean> => {
    try {
      const oldCoins = await getCoins();
      if (oldCoins?.includes(symbol)) {
        toast('Token already exists ⚠️', { duration: 2000, id: 'token-already-exists' });
        return false;
      }
      await setCoins([...oldCoins, symbol]);
      setTimeout(() => {
        onTokenAdded?.();
        toast.success('Token added successfully', { duration: 2000, id: 'token-added' });
      }, 1500);
      return true;
    } catch {
      toast.error('Token addition failed', { duration: 2000, id: 'token-add-failed' });
      return false;
    }
  };

  //  弹窗内点击 token（已知合法币种，跳过验证）
  const handleSelectToken = async (symbol: string) => {
    if (loading || addedSet.has(symbol)) return;
    setLoading(true);
    try {
      await saveToken(symbol);
      setShowAddDialog(false);
    } finally {
      setLoading(false);
    }
  };

  // 弹窗内搜索框 Enter：精确匹配则直接添加
  const handleEnter = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !searchVal) return;
    const exact = dialogTokenList.find(t => t.symbol === searchVal.toUpperCase());
    if (exact) {
      await handleSelectToken(exact.symbol);
    } else {
      toast.error(`${searchVal} is not in the supported list`, { duration: 2000, id: 'token-not-supported' });
    }
  };

  // 搜索框输入变化
  const handleChange = (val: string) => {
    setSearchVal(sanitizeSymbolInput(val));
  };

  return (
    <>
      {/* 触发行：输入框聚焦 或 点 Add 均打开弹窗 */}
      <div className="search_token mt-4 flex items-center shrink-0">
        <Input value="" placeholder={config.placeholder} onFocus={openAddDialog} disabled={loading} readOnly />
        <Button className="ml-4" variant="gradient" disabled={loading} onClick={openAddDialog}>
          Add
        </Button>
      </div>

      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm">
        <DialogHeader title={config.dialogTitle} onClose={() => setShowAddDialog(false)} />

        {/* 搜索框 */}
        <div className="px-4 pt-3 pb-2">
          <SearchInput inputRef={inputRef} value={searchVal} placeholder={config.placeholder} onChange={handleChange} onKeyDown={handleEnter} onClear={() => setSearchVal('')} />
        </div>

        <PopularSuggestions items={config.popularItems} addedSet={addedSet} loading={loading} onSelect={handleSelectToken} suffix={config.suffix} />

        <TokenList list={dialogTokenList} addedSet={addedSet} loading={loading} mode={mode} onSelect={handleSelectToken} />
      </Dialog>
    </>
  );
};
