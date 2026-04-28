import type { ChangeEvent, KeyboardEvent } from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Search, X } from 'lucide-react';

import Input from '@/components/common/input';
import Button from '@/components/common/button';
import Dialog from '@/components/common/dialog';

import type { TokenItem } from '@/types/index';
import { type ExchangeType, defaultDataSource, POPULAR_TOKENS } from '@/config/exchangeConfig';
import { SUPPORTED_TOKENS } from '@/utils/tokens';
import { PLATFORM } from '@/utils/index';

// 热门推

// 数据源 → 平台 bit 映射，HL 不在 bitmask 里则不过滤
const EXCHANGE_BIT: Partial<Record<ExchangeType, number>> = {
  BN: PLATFORM.BN,
  OKX: PLATFORM.OKX,
  Gate: PLATFORM.GATE
};

// ----------------------------- helpers -----------------------------
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

// ----------------------------- types ------------------------------
interface TokenSearchProps {
  tokens: TokenItem[];
  onTokenAdded?: () => void;
}

// ========================= TokenSearch ============================
export const TokenSearch = ({ tokens, onTokenAdded }: TokenSearchProps) => {
  // ---------- 主页搜索（仅作为触发器，不直接使用） ----------
  const [searchValue, setSearchValue] = useState('');
  const [errorTip, setErrorTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ---------- "Add crypto" 弹窗 ----------
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dialogSearch, setDialogSearch] = useState('');
  const [currentDataSource, setCurrentDataSource] = useState<ExchangeType>(defaultDataSource);
  const dialogInputRef = useRef<HTMLInputElement>(null);

  // 已添加的 symbol 集合（O(1) 查找）
  const addedSet = useMemo(() => new Set(tokens?.map(t => t.symbol) ?? []), [tokens]);

  // 打开弹窗：读取当前数据源
  const openAddDialog = async () => {
    const { data_source } = await chrome.storage.local.get('data_source');
    setCurrentDataSource((data_source as ExchangeType) || defaultDataSource);
    setDialogSearch('');
    setShowAddDialog(true);
  };

  // 弹窗打开后聚焦搜索框
  useEffect(() => {
    if (showAddDialog) {
      const timer = setTimeout(() => dialogInputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [showAddDialog]);

  // 根据数据源过滤 SUPPORTED_TOKENS
  const filteredBySource = useMemo(() => {
    const bit = EXCHANGE_BIT[currentDataSource];
    const all = SUPPORTED_TOKENS as unknown as Array<{ symbol: string; platform: number }>;
    return bit === undefined ? all : all.filter(t => (t.platform & bit) !== 0);
  }, [currentDataSource]);

  // 根据弹窗搜索词二次过滤
  const dialogTokenList = useMemo(() => {
    const q = dialogSearch.toUpperCase();
    if (!q) return filteredBySource;
    return filteredBySource.filter(t => t.symbol.startsWith(q));
  }, [filteredBySource, dialogSearch]);

  // -------------------- 通用保存逻辑 --------------------
  const saveToken = async (symbol: string): Promise<boolean> => {
    try {
      const oldCoins = await getCoins();
      if (oldCoins?.includes(symbol)) {
        toast('Token already exists ⚠️', { duration: 2000, id: 'token-already-exists' });
        setSearchValue('');
        return false;
      }
      await setCoins([...oldCoins, symbol]);
      setSearchValue('');
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

  // -------------------- 弹窗内点击 token（已知合法币种，跳过验证）----
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

  // -------------------- 弹窗内搜索框 Enter：精确匹配则直接添加 ----
  const handleDialogSearchEnter = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !dialogSearch) return;
    const exact = filteredBySource.find(t => t.symbol === dialogSearch);
    if (exact) {
      await handleSelectToken(exact.symbol);
    } else {
      toast.error(`${dialogSearch} is not in the supported list`, { duration: 2000, id: 'token-not-supported' });
    }
  };

  const changeSearchValue = (event: ChangeEvent<HTMLInputElement>) => {
    setErrorTip(null);
    setSearchValue(event.target.value.replace(/[^a-zA-Z0-9\u4e00-\u9fff\u3400-\u4dbf]/g, '')?.toUpperCase());
  };

  // ========================= RENDER ==========================
  return (
    <>
      {/* 触发行：输入框聚焦 或 点 Add 均打开弹窗 */}
      <div className="search_token mt-4 flex items-center flex-shrink-0">
        <Input value={searchValue} errorTip={errorTip} placeholder="Search Symbol (e.g. BTC)" onFocus={openAddDialog} onChange={changeSearchValue} disabled={loading} readOnly />
        <Button className="ml-4" variant="gradient" disabled={loading} onClick={openAddDialog}>
          Add
        </Button>
      </div>

      {/* ===================== Add crypto 弹窗 ===================== */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
          <h3 className="text-white font-semibold text-base">Add Crypto</h3>
          <button onClick={() => setShowAddDialog(false)} className="text-gray-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2.5 border border-white/10 focus-within:border-white/25 transition">
            <Search className="w-4 h-4 text-white/35 flex-shrink-0" />
            <input
              ref={dialogInputRef}
              value={dialogSearch}
              onChange={e => setDialogSearch(e.target.value.replace(/[^a-zA-Z0-9\u4e00-\u9fff\u3400-\u4dbf]/g, '')?.toUpperCase())}
              onKeyDown={handleDialogSearchEnter}
              placeholder="Search Symbol (e.g. BTC)"
              className="bg-transparent text-white text-sm placeholder:text-white/25 outline-none w-full"
            />
            {dialogSearch && (
              <button onClick={() => setDialogSearch('')} className="text-white/30 hover:text-white/60 transition cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Popular Suggestions（未搜索时显示） */}

        <div className="px-4 py-2">
          <p className="text-[10px] font-semibold tracking-widest text-white/35 uppercase mb-2">Popular Suggestions</p>
          <div className="grid grid-cols-3 gap-1.5">
            {POPULAR_TOKENS.map(symbol => {
              const added = addedSet.has(symbol);
              return (
                <button
                  key={symbol}
                  disabled={loading || added}
                  onClick={() => handleSelectToken(symbol)}
                  className={`text-xs font-medium py-2 rounded-xl border transition-all duration-150
                      ${added ? 'border-white/8 text-white/20 bg-white/3 cursor-not-allowed' : 'border-white/12 text-white/65 bg-white/5 hover:bg-white/12 hover:text-white hover:border-white/25 cursor-pointer active:scale-95'}`}
                >
                  {symbol}/USDT
                </button>
              );
            })}
          </div>
        </div>

        {/* Symbol 列表 */}
        <div className="px-4 pt-2 pb-1">
          <p className="text-[10px] font-semibold tracking-widest text-white/35 uppercase">
            Symbols
            <span className="ml-1.5 text-white/20 normal-case tracking-normal font-normal">({dialogTokenList.length})</span>
          </p>
        </div>
        <div className="overflow-y-auto h-50 scrollbar-hide pb-3">
          {dialogTokenList.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-white/25">
              <p className="text-sm">No tokens found</p>
            </div>
          ) : (
            dialogTokenList.map(({ symbol }) => {
              const added = addedSet.has(symbol);
              return (
                <button
                  key={symbol}
                  disabled={loading || added}
                  onClick={() => handleSelectToken(symbol)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 transition-all duration-100
                    ${added ? 'opacity-25 cursor-not-allowed' : 'hover:bg-white/6 cursor-pointer active:bg-white/12'}`}
                >
                  <span className="text-sm font-bold text-white">{symbol} / USDT</span>
                  <span className="text-xs text-white/35">{symbol}</span>
                </button>
              );
            })
          )}
        </div>
      </Dialog>
    </>
  );
};
