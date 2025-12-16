import type { ChangeEvent, KeyboardEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import toast from 'react-hot-toast';

import Input from '@/components/common/input';
import Button from '@/components/common/button';
import Select from '@/components/common/select';
import { CustomToaster } from '@/components/CustomToaster/index';

import { TokenItem } from '@/types/index';
import { formatNumberWithCommas, queryTokenLocal } from '@/utils/index';
import { Loader } from 'lucide-react';

import { ExchangeList } from '@/config/exchangeConfig';

// 异步 fetcher，封装 sendMessage
function fetchPrices(): Promise<TokenItem[]> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_LATEST_PRICES' }, resp => {
      resolve(resp?.data || []);
    });
  });
}

export default function PopupContent() {
  const [countdown, setCountdown] = useState(10);
  const [tokens, setTokens] = useState<TokenItem[]>([]);

  // 轮询，每15秒自动刷新一次
  const {
    data: tokenList,
    isLoading,
    mutate
  } = useSWR<TokenItem[]>('token-prices', fetchPrices, {
    revalidateOnFocus: true, // 自动聚焦时刷新，体验更好
    fallbackData: [] // 默认返回一个空数组
  });

  useEffect(() => {
    if (tokenList?.length) setTokens(tokenList);
  }, [tokenList]);

  // 搜索输入框
  const [searchValue, setSearchValue] = useState<string>('');
  const [errorTip, setErrorTip] = useState<string | null>(null);
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
  }, [searchValue]);

  const handleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') await addToken();
  };
  const addToken = async () => {
    if (!searchValue) return;
    if (alreadyExistToken) {
      setErrorTip(`${searchValue} already exists`);
      return;
    }
    const isIpCN = await queryIpCN();
    let effectiveToken = false;
    if (isIpCN) {
      effectiveToken = queryTokenLocal(searchValue);
    } else {
      effectiveToken = await queryToken(searchValue);
    }

    if (!effectiveToken) {
      setErrorTip(`Invalid token`);
      return;
    }
    await saveToken(searchValue);
  };

  /**
   * 查询当前连接的网络否是大陆
   *
   */
  const queryIpCN = async (): Promise<boolean> => {
    try {
      const ipinfo = await fetch('https://ipapi.co/json/').then(r => r.json());
      if (ipinfo.country === 'CN') return true; // 非中国网络，大概率VPN或在海外
      return false;
    } catch (err) {
      return true;
    }
  };

  /**
   * 查询是否是有效token
   * https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT
   * @param {string} symbol 要查询的token BTC、ETH
   */
  const [loading, setLoading] = useState(false);
  const queryUrl = 'https://www.okx.com/api/v5/market/ticker';
  const queryToken = async (symbol: string): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch(`${queryUrl}?instId=${symbol}-USDT`);
      const data = await res.json();
      if (data.code === '0') return true;
      return false;
    } catch (error) {
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存 token 到 storage.local 中
   */
  const saveToken = async (symbol: string): Promise<void> => {
    try {
      const result = await chrome.storage.local.get(['coins']);
      const oldCoins: string[] = result.coins ?? [];
      if (oldCoins?.includes(symbol)) {
        toast('Token already exists ⚠️', { duration: 2000 });
        setSearchValue('');
        return;
      }
      const newCoins = [...oldCoins, symbol];
      await chrome.storage.local.set({ coins: newCoins });
      setSearchValue('');
      setCountdown(10);
      await mutate();
      toast.success('Token added successfully', {
        duration: 2000
      });
    } catch (error) {
      toast.error('Token addition failed', {
        duration: 2000
      });
    }
  };

  // 倒计时
  useEffect(() => {
    setCountdown(10); // 初始化
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          mutate(); // 刷新一次（建议异步不需要等它返回）
          return 10; // 立即重置倒计时
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [tokens?.length]);

  // 手动刷新
  const refreshData = () => {
    setCountdown(10);
    chrome.runtime.sendMessage({ type: 'REFRESH', payload: { falg: true } }, async response => {
      if (response.success) {
        await mutate();
        toast.success(response?.msg, {
          duration: 2000
        });
      } else {
        toast.error(response?.msg, {
          duration: 2000
        });
      }
    });
  };

  // 移除按钮
  const removeToken = async (symbol: string) => {
    if (!symbol) return;
    const result = await chrome.storage.local.get(['coins']);
    const oldTokenList: string[] = result.coins ?? [];
    if (!oldTokenList?.includes(symbol)) return;
    // 👉 关键一步：过滤掉要删除的 symbol
    const newTokenList = oldTokenList.filter(item => item !== symbol);
    // 保存更新后的数组
    await chrome.storage.local.set({ coins: newTokenList });
    setCountdown(10);
    await mutate();
    // 可选：提示成功
    toast.success(`${symbol} has been removed`, { duration: 2000 });
  };

  const [value, setValue] = useState<string>(ExchangeList[0]);

  const dataSource = useMemo(() => {
    return ExchangeList.map(item => ({
      label: item,
      value: item,
      desc: item === 'Gate' ? 'No VPN' : 'Need VPN'
    }));
  }, [ExchangeList]);

  const initDataSource = async () => {
    const { data_source } = await chrome.storage.local.get('data_source');
    if (data_source) {
      setValue(data_source);
    } else {
      const defaultSource = ExchangeList[0];
      if (defaultSource) {
        setValue(defaultSource);
        await chrome.storage.local.set({ data_source: defaultSource });
      }
    }
  };

  const changeSelect = async (val: string) => {
    await chrome.storage.local.set({ data_source: val });
    setValue(val);
  };

  useEffect(() => {
    initDataSource();
  }, []);

  return (
    <>
      <div className="w-[360px] max-h-[1228px] font-mono bg-gray-900 text-white shadow-2xl backdrop-blur-lg p-3 ">
        <CustomToaster />
        <div className="flex justify-between items-center">
          <div>
            <h2 className="m-0 text-base font-semibold">Crypto Tracker</h2>
            <p className="text-xs text-white/50">Real-time prices</p>
          </div>
          <div>
            <Select
              value={value}
              onChange={(val: string) => {
                changeSelect(val);
              }}
              placeholder="Data source"
              options={dataSource}
            />
          </div>
        </div>
        <div className="search_token mt-4 flex items-center">
          <Input value={searchValue} errorTip={errorTip} placeholder="Search symbol(e.g. BTC)" onKeyDown={handleKeyDown} onChange={changeSearchValue} disabled={loading} />
          <Button className="ml-4" variant="gradient" disabled={loading} onClick={addToken}>
            Add
          </Button>
        </div>

        <div className="mt-5 overflow-auto max-h-[300px] scrollbar-hide">
          {Array.isArray(tokens)
            ? tokens?.map((item: TokenItem) => {
                const chColor = item?.change === null ? '#999' : item?.change >= 0 ? '#16a34a' : '#ef4444';
                return (
                  <motion.div whileHover={{ scale: 1 }} key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center p-2 box-border rounded-xl mb-1.5 bg-white/5 hover:bg-white/10 cursor-pointer transition">
                    <div className="flex items-center">
                      <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-base font-medium">{item?.icon}</div>
                      <div className="ml-2 min-w-15">
                        <div className="text-[13px] font-bold">{item?.symbol}</div>
                        <div className="text-[11px] font-mono text-[#9ca3af]">{item.id}</div>
                      </div>
                    </div>
                    <div className="text-left ml-5">
                      <div className="font-semibold text-sm">{item?.price ? formatNumberWithCommas(item?.price) : '-'}</div>
                      <div className="text-[11px]" style={{ color: chColor }}>
                        {item.change === null ? '—' : item.change >= 0 ? '+' + item.change + '%' : item.change + '%'}
                      </div>
                    </div>
                    {tokens.length > 1 ? (
                      <div className="justify-self-end">
                        <button className="px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer text-xs" onClick={() => removeToken(item.symbol)}>
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </motion.div>
                );
              })
            : null}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-white/50">{isLoading ? <Loader className="animate-spin" size={12} /> : `${countdown}s`}</div>
          <button className="px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer text-xs" onClick={refreshData}>
            Refresh
          </button>
        </div>
      </div>
    </>
  );
}
