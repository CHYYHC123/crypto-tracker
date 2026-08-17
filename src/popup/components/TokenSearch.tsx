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
import type { AssetTypes } from '@/types/asset';
import { sanitizeSymbolInput } from '@/utils/index';
import { validateCount } from '@/popup/utils/validateCount';
import { useAddAsset } from '@/popup/hooks/useAddAsset';

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

interface TokenSearchProps {
  tokens: AssetItem[];
  onTokenAdded?: () => void;
  mode?: AssetTypes;
}

// TokenSearch
export const TokenSearch = ({ tokens, onTokenAdded, mode = 'crypto' }: TokenSearchProps) => {
  const config = MODE_CONFIG[mode];
  const { saveAsset, loading } = useAddAsset(mode, onTokenAdded);

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

  //  弹窗内点击 token（已知合法币种，跳过验证）
  const handleSelectToken = async (symbol: string) => {
    if (loading || addedSet.has(symbol)) return;
    const ok = await saveAsset(symbol);
    if (ok) setShowAddDialog(false);
  };

  // 弹窗内搜索框 Enter：精确匹配则直接添加
  const handleEnter = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !searchVal) return;
    const exact = dialogTokenList.find(t => t.symbol === searchVal.toUpperCase());
    if (!exact) {
      toast.error(`${searchVal} is not in the supported list`, { duration: 2000, id: 'token-not-supported' });
      return;
    }
    await handleSelectToken(exact.symbol);
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
