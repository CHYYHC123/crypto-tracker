import type { ChangeEvent, KeyboardEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import toast from 'react-hot-toast';

import Input from '@/components/common/input';
import Button from '@/components/common/button';
import Select from '@/components/common/select';
import ConfirmDialog from '@/components/common/confirm-dialog';
import { CustomToaster } from '@/components/CustomToaster/index';
// @ts-ignore
import ActionMenu from '@/components/common/ActionMenu';
import ActionMenuItem from '@/components/common/ActionMenuItem';
import Tooltip from '@/components/common/tooltip';

import PriceAlertInput from './components/PriceAlter';
import { Direction } from './components/PriceAlter';
import AlertBadge from './components/AlertBadge';

import type { TokenItem, PriceAlert } from '@/types/index';

import { formatNumberWithCommas, queryTokenLocal } from '@/utils/index';
import { Loader, Ellipsis, X, Power, PowerOff } from 'lucide-react';

import { ExchangeList } from '@/config/exchangeConfig';

import NetworkState from '@/content/views/networkState';
import { useDataStatus } from '@/hooks/useDataStatus';

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
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);

  // 网络状态
  const status = useDataStatus();

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
    setTokens(tokenList ?? []);
  }, [tokenList]);

  // 读取 price_alerts
  useEffect(() => {
    const loadPriceAlerts = () => {
      chrome.storage.local.get('price_alerts', res => {
        const alerts = (res.price_alerts as PriceAlert[]) || [];
        setPriceAlerts(alerts);
      });
    };

    loadPriceAlerts();

    // 监听 storage 变化
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.price_alerts) {
        loadPriceAlerts();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // 监听消息通知
    const handleMessage = (msg: any) => {
      if (msg.type === 'PRICE_ALERTS_UPDATED') loadPriceAlerts();
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // 搜索输入框
  const [searchValue, setSearchValue] = useState<string>('');
  const [errorTip, setErrorTip] = useState<string | null>(null);

  // 强制添加弹窗
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingToken, setPendingToken] = useState<string>('');
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

  // 添加 token 按下回车键触发
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
      // 验证失败，显示确认弹窗让用户选择是否强制添加
      setPendingToken(searchValue);
      setShowConfirm(true);
      setErrorTip(`Invalid token`);
      return;
    }
    await saveToken(searchValue);
  };

  // 强制添加 token
  const handleForceAdd = async () => {
    if (pendingToken) {
      await saveToken(pendingToken);
      setPendingToken('');
      setErrorTip(null);
    }
  };

  /**
   * 查询当前连接的网络否是大陆
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
      const oldCoins = await getCoins();
      if (oldCoins?.includes(symbol)) {
        toast('Token already exists ⚠️', { duration: 2000 });
        setSearchValue('');
        return;
      }
      const newCoins = [...oldCoins, symbol];
      await setCoins(newCoins);
      setSearchValue('');
      setCountdown(10);

      setTimeout(() => {
        mutate();
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
  const [removing, setRemoving] = useState(false);
  const removeToken = async (symbol: string) => {
    if (!symbol || removing) return;
    setRemoving(true);
    try {
      const oldTokenList = await getCoins();
      if (!oldTokenList?.includes(symbol)) return;

      // 检查：如果只剩一个币种，不允许删除
      if (oldTokenList.length <= 1) {
        toast.loading('At least one token must be kept', { duration: 2000 });
        setRemoving(false);
        return;
      }

      // 👉 关键一步：过滤掉要删除的 symbol
      const newTokenList = oldTokenList.filter(item => item !== symbol);
      // 保存更新后的数组
      await setCoins(newTokenList);
      setCountdown(10);
      setTimeout(() => {
        mutate();
        // 可选：提示成功
        toast.success(`${symbol} has been removed`, { duration: 2000 });
      }, 1500);
    } finally {
      setRemoving(false);
    }
  };

  // ActionMenu 状态
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [menuToken, setMenuToken] = useState<TokenItem | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>, tokenItme: TokenItem) => {
    if (removing) return;
    setAnchorEl(e.currentTarget);
    setMenuToken(tokenItme);
  };
  // 关闭时重置样式，确保下次打开时重新计算
  const handleClose = () => {
    setAnchorEl(null);
    setMenuToken(null);
  };
  // 设置预警价格
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [price, setPrice] = useState(0);
  const [alertToken, setAlertToken] = useState<TokenItem | null>(null);
  const [direction, setDirection] = useState<Direction>('above'); // 'above' 或 'below'
  const [enabledAlert, setEnabledAlert] = useState(true); // 是否启用预警
  const setPriceAlert = () => {
    if (!menuToken) return;

    // 查找该币种是否已有预警配置
    const existingAlert = priceAlerts.find(a => a.symbol.toUpperCase() === menuToken.symbol.toUpperCase());

    if (existingAlert) {
      // 如果存在预警，同步数据到表单
      setPrice(existingAlert.targetPrice);
      setDirection(existingAlert.direction);
      setEnabledAlert(existingAlert.enabled);
    } else {
      // 如果不存在，使用默认值
      setPrice(menuToken.price || 0);
      setDirection('above');
      setEnabledAlert(true);
    }

    setAlertToken(menuToken);
    setShowPriceAlert(true);
    handleClose();
  };

  // 点击 AlertBadge 唤起弹窗
  const handleAlertBadgeClick = (token: TokenItem) => {
    const existingAlert = priceAlerts.find(a => a.symbol.toUpperCase() === token.symbol.toUpperCase());

    if (existingAlert) {
      // 同步现有预警数据到表单
      setPrice(existingAlert.targetPrice);
      setDirection(existingAlert.direction);
      setEnabledAlert(existingAlert.enabled);
    } else {
      // 如果没有预警，使用当前价格和默认值
      setPrice(token.price || 0);
      setDirection('above');
      setEnabledAlert(true);
    }

    setAlertToken(token);
    setShowPriceAlert(true);
  };
  // 点击 Save 按钮
  const handlePriceAlert = async () => {
    if (!alertToken || !alertToken?.price) return;

    // ✅ 合理性校验（方向 + 当前价格）
    // if (direction === 'above' && price < alertToken.price) {
    //   toast.error('Alert price must be higher than current price');
    //   return;
    // }
    // if (direction === 'below' && price > alertToken.price) {
    //   toast.error('Alert price must be lower than current price');
    //   return;
    // }

    const newAlert: PriceAlert = {
      symbol: alertToken.symbol,
      targetPrice: price,
      direction,
      enabled: enabledAlert,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    try {
      const result = await chrome.storage.local.get(['price_alerts']);
      const oldAlerts = (result.price_alerts as PriceAlert[]) ?? [];
      const existingIndex = oldAlerts.findIndex(alert => alert.symbol === alertToken.symbol);

      let updatedAlerts;
      // 已存在 → 更新
      if (existingIndex > -1) {
        updatedAlerts = [...oldAlerts];
        updatedAlerts[existingIndex] = {
          ...oldAlerts[existingIndex],
          targetPrice: price,
          direction,
          enabled: enabledAlert,
          updatedAt: Date.now()
        };
      } else {
        // 不存在 → 新增
        updatedAlerts = [...oldAlerts, newAlert];
      }
      await chrome.storage.local.set({
        price_alerts: updatedAlerts
      });
      toast.success(`Price alert set for ${alertToken.symbol}`, { duration: 2000 });

      // 关闭弹窗 & 清理状态
      setShowPriceAlert(false);
      setAlertToken(null);
    } catch (error) {
      toast.error('Failed to save price alert', { duration: 2000 });
    }
  };

  // 数据源
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
    if (typeof data_source === 'string') {
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
      <div className="w-[360px] h-[480px] font-mono bg-gray-900 text-white shadow-2xl backdrop-blur-lg p-3 flex flex-col">
        <CustomToaster />
        <div className="flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="m-0 text-base font-semibold">Crypto Tracker</h2>
            <div className="mt-1">
              <NetworkState status={status} />
            </div>
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
        <div className="search_token mt-4 flex items-center flex-shrink-0">
          <Input value={searchValue} errorTip={errorTip} placeholder="Search symbol(e.g. BTC)" onKeyDown={handleKeyDown} onChange={changeSearchValue} disabled={loading} />
          <Button className="ml-4" variant="gradient" disabled={loading} onClick={addToken}>
            Add
          </Button>
        </div>

        <div className="mt-5 overflow-auto flex-1 scrollbar-hide">
          {Array.isArray(tokens) && tokens.length > 0 ? (
            tokens.map((item: TokenItem) => {
              const chColor = item?.change === null ? '#999' : item?.change >= 0 ? '#16a34a' : '#ef4444';
              // 查找该币种对应的预警
              const alert = priceAlerts.find(a => a.symbol.toUpperCase() === item.symbol.toUpperCase());
              return (
                <motion.div whileHover={{ scale: 1 }} key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center p-2 box-border rounded-xl mb-1.5 bg-white/5 hover:bg-white/10 cursor-pointer transition">
                  <div className="flex items-center">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-base font-medium">{item?.icon}</div>
                    <div className="ml-2 min-w-15">
                      <div className="text-[13px] font-bold">{item?.symbol}</div>
                      {alert ? <AlertBadge AlertInfo={alert} onClick={() => handleAlertBadgeClick(item)} /> : <div className="text-[11px] font-mono text-[#9ca3af]">{item.id}</div>}
                    </div>
                  </div>
                  <div className="text-left ml-5">
                    <div className="font-semibold text-sm">{item?.price ? formatNumberWithCommas(item?.price) : '-'}</div>
                    <div className="text-[11px]" style={{ color: chColor }}>
                      {item.change === null ? '—' : item.change >= 0 ? '+' + item.change + '%' : item.change + '%'}
                    </div>
                  </div>

                  <div className="justify-self-end">
                    <div onClick={e => handleOpen(e, item)} aria-haspopup="true" aria-expanded={open && menuToken?.symbol === item.symbol} className={`px-2 py-1 bg-white/0 rounded-md transition text-xs ${removing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}`}>
                      <Ellipsis size={16} />
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-[150px] text-white/40">
              <div className="text-sm">No tokens yet</div>
              <div className="text-xs mt-1 opacity-60">Add a token to get started</div>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 flex-shrink-0">
          <div className="text-xs text-white/50">{isLoading ? <Loader className="animate-spin" size={12} /> : `${countdown}s`}</div>
          <button className="px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer text-xs" onClick={refreshData}>
            Refresh
          </button>
        </div>
      </div>

      {/* ActionMenu - 移到最外层 div 外面，避免影响父容器布局 */}
      <ActionMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <ActionMenuItem onClick={setPriceAlert}>Price Alert</ActionMenuItem>
        <ActionMenuItem
          danger
          onClick={() => {
            if (menuToken?.symbol) removeToken(menuToken?.symbol);
            handleClose();
          }}
        >
          Remove
        </ActionMenuItem>
      </ActionMenu>

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

      {/* 设计币种价格预警弹窗 */}
      <ConfirmDialog
        open={showPriceAlert}
        onClose={() => setShowPriceAlert(false)}
        onConfirm={handlePriceAlert}
        type="custom"
        header={
          <>
            <div className="p-3 border-b-1 border-gray-600">
              <div className="flex justify-between gap-2">
                <h3 className="text-white/90 font-semibold text-base flex items-center">
                  <span>Set alert for {alertToken?.symbol}</span>

                  <Tooltip content={enabledAlert ? 'Price alert enabled' : 'Price alert disabled'} side="bottom">
                    {enabledAlert ? <Power size={16} onClick={() => setEnabledAlert(false)} className="ml-4 cursor-pointer text-green-500" /> : <PowerOff size={16} onClick={() => setEnabledAlert(true)} className="ml-4 cursor-pointer text-red-500" />}
                  </Tooltip>
                </h3>
                <button onClick={() => setShowPriceAlert(false)} className="text-gray-400 hover:text-white transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-white/70 font-normal text-xs">Current: {alertToken?.price}</p>
            </div>
          </>
        }
        description={<PriceAlertInput price={price} direction={direction} onPriceChange={setPrice} onDirectionChange={setDirection} />}
        confirmText="Save"
        cancelText="Cancel"
      />
    </>
  );
}
