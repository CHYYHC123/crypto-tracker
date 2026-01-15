import type { ChangeEvent, KeyboardEvent } from 'react';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';

import Input from '@/components/common/input';
import Button from '@/components/common/button';
import ConfirmDialog from '@/components/common/confirm-dialog';

import type { TokenItem } from '@/types/index';
import { type ExchangeType, defaultDataSource } from '@/config/exchangeConfig';
import { validateToken } from '@/popup/utils/validateToken';

// 通过消息传递访问 background 的 coinsManager
async function getCoins(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'GET_COINS' }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.success) {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || 'Failed to get coins'));
      }
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
      if (response?.success) {
        resolve();
      } else {
        reject(new Error(response?.error || 'Failed to set coins'));
      }
    });
  });
}

interface TokenSearchProps {
  /** 当前 token 列表，用于检查是否已存在 */
  tokens: TokenItem[];
  /** 添加成功后的回调，用于刷新数据 */
  onTokenAdded?: () => void;
}

export const TokenSearch = ({ tokens, onTokenAdded }: TokenSearchProps) => {
  // 搜索输入框
  const [searchValue, setSearchValue] = useState<string>('');
  const [errorTip, setErrorTip] = useState<string | null>(null);

  // 强制添加弹窗
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingToken, setPendingToken] = useState<string>('');

  // Loading 状态
  const [loading, setLoading] = useState(false);

  const changeSearchValue = (event: ChangeEvent<HTMLInputElement>) => {
    setErrorTip(null); // 清除错误样式
    const rawValue = event.target.value;
    // 1. 仅保留英文字母
    const onlyLetters = rawValue.replace(/[^a-zA-Z0-9]/g, '');
    // 2. 转为大写
    const uppercased = onlyLetters.toUpperCase();
    setSearchValue(uppercased);
  };

  // Token是否已经存在
  const alreadyExistToken = useMemo(() => {
    const alreadyExist = tokens?.some((token: TokenItem) => token.symbol === searchValue);
    return alreadyExist;
  }, [searchValue, tokens]);

  // 添加 token 按下回车键触发
  const handleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') await addToken();
  };

  /**
   * 保存 token 到 storage.local 中
   */
  const saveToken = async (symbol: string): Promise<void> => {
    try {
      const oldCoins = await getCoins();
      if (oldCoins?.includes(symbol)) {
        toast('Token already exists ⚠️', { duration: 2000 });
        setSearchValue('');
        return;
      }
      const newCoins = [...oldCoins, symbol];
      await setCoins(newCoins);
      setSearchValue('');

      setTimeout(() => {
        onTokenAdded?.();
        toast.success('Token added successfully', {
          duration: 2000
        });
      }, 1500);
    } catch (error) {
      toast.error('Token addition failed', {
        duration: 2000
      });
    }
  };

  const addToken = async () => {
    if (!searchValue) return;
    if (alreadyExistToken) {
      setErrorTip(`${searchValue} already exists`);
      return;
    }

    // 获取当前数据源
    const { data_source } = await chrome.storage.local.get('data_source');
    const currentDataSource = (data_source as ExchangeType) || defaultDataSource;

    // 使用提取的验证方法
    setLoading(true);
    try {
      const effectiveToken = await validateToken(searchValue, currentDataSource);

      if (!effectiveToken) {
        // 验证失败，显示确认弹窗让用户选择是否强制添加
        setPendingToken(searchValue);
        setShowConfirm(true);
        setErrorTip(`Invalid token`);
        return;
      }
      await saveToken(searchValue);
    } finally {
      setLoading(false);
    }
  };

  // 强制添加 token
  const handleForceAdd = async () => {
    if (pendingToken) {
      await saveToken(pendingToken);
      setPendingToken('');
      setErrorTip(null);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <div className="search_token mt-4 flex items-center flex-shrink-0">
        <Input value={searchValue} errorTip={errorTip} placeholder="Search symbol(e.g. BTC)" onKeyDown={handleKeyDown} onChange={changeSearchValue} disabled={loading} />
        <Button className="ml-4" variant="gradient" disabled={loading} onClick={addToken}>
          Add
        </Button>
      </div>

      {/* 强制添加确认弹窗 */}
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleForceAdd}
        type="danger"
        title="Invalid Token"
        description={
          <>
            <div className="px-4 py-2 text-gray-300 text-sm leading-relaxed">
              The token '{pendingToken}' was not found.
              <br />
              It may not display price data. Please remove '{pendingToken}' if no data appears.
            </div>
          </>
        }
        confirmText="Force Add"
        cancelText="Cancel"
      />
    </>
  );
};

