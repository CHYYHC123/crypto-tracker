import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import toast from 'react-hot-toast';

import ConfirmDialog from '@/components/common/confirm-dialog';
// @ts-ignore
import ActionMenu from '@/components/common/ActionMenu';
import ActionMenuItem from '@/components/common/ActionMenuItem';
import Tooltip from '@/components/common/tooltip';

import PriceAlertInput from '@/popup/components/PriceAlter';
import { Direction } from '@/popup/components/PriceAlter';
import AlertBadge from '@/popup/components/AlertBadge';
import { Header } from '@/popup/components/Header';
import { TokenSearch } from '@/popup/components/TokenSearch';
import { EmptyState } from '@/popup/components/EmptyState';
import { Footer } from '@/popup/components/Footer';
import Checkbox from '@/components/common/checkbox';

import type { TokenItem, PriceAlert } from '@/types/index';

import { formatNumberWithCommas } from '@/utils/index';
import { Ellipsis, X, Power, PowerOff } from 'lucide-react';
import { useBatchTokenSelect } from '@/popup/hooks/useBatchTokenSelect';

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

  const { batchSelect, selectedTokens, removing, handleToggleToken, removeToken } = useBatchTokenSelect({
    tokens,
    setCountdown,
    mutate
  });

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

  // Token 添加成功后的回调
  const handleTokenAdded = () => {
    setCountdown(10);
    mutate();
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
        toast.success(response?.msg, { duration: 2000 });
      } else {
        toast.error(response?.msg, { duration: 2000 });
      }
    });
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

  const listRef = useRef<HTMLDivElement>(null);
  const prevTokensLengthRef = useRef<number>(0);

  useEffect(() => {
    if (tokens.length > prevTokensLengthRef.current && prevTokensLengthRef.current > 0) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }
    prevTokensLengthRef.current = tokens.length;
  }, [tokens.length]);

  return (
    <>
      <div className="w-full h-full font-mono bg-gray-900 text-white shadow-2xl backdrop-blur-lg p-3 flex flex-col">
        <Header />

        <TokenSearch tokens={tokens} onTokenAdded={handleTokenAdded} />

        <div ref={listRef} className="mt-5 overflow-auto flex-1 scrollbar-hide relative">
          {Array.isArray(tokens) && tokens.length > 0 ? (
            tokens.map((item: TokenItem) => {
              const chColor = item?.change === null ? '#999' : item?.change >= 0 ? '#16a34a' : '#ef4444';
              // 查找该币种对应的预警
              const alert = priceAlerts.find(a => a.symbol.toUpperCase() === item.symbol.toUpperCase());
              return (
                <div key={item.id} className="flex items-center">
                  <AnimatePresence>
                    {batchSelect.showCheckboxes && (
                      <motion.div initial={{ opacity: 0, width: 0, marginRight: 0 }} animate={{ opacity: 1, width: 20, marginRight: 8 }} exit={{ opacity: 0, width: 0, marginRight: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} className="overflow-hidden shrink-0">
                        <div className="w-5">
                          <Checkbox checked={selectedTokens.has(item.symbol)} onChange={e => handleToggleToken(item.symbol, e.target.checked)} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.div
                    layout
                    whileHover={{ scale: 1 }}
                    key={item.id}
                    className="grid grid-cols-[auto_1fr_auto] items-center p-2 box-border rounded-xl mb-1.5 bg-white/5 hover:bg-white/10 cursor-pointer transition flex-1 min-w-0"
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], layout: { duration: 0.3 } }}
                  >
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
                </div>
              );
            })
          ) : (
            <EmptyState />
          )}
        </div>

        <Footer isLoading={isLoading} countdown={countdown} onRefresh={refreshData} batchSelect={batchSelect} />
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

      {/* 设计币种价格预警弹窗 */}
      <ConfirmDialog
        open={showPriceAlert}
        onClose={() => setShowPriceAlert(false)}
        onConfirm={handlePriceAlert}
        type="custom"
        header={
          <>
            <div className="p-3 border-b border-gray-600">
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
