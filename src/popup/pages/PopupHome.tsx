import { useState, useEffect, useRef } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import toast from 'react-hot-toast';

// import ConfirmDialog from '@/components/common/confirm-dialog';
// @ts-ignore
import ActionMenu from '@/components/common/ActionMenu';
import ActionMenuItem from '@/components/common/ActionMenuItem';
// import Tooltip from '@/components/common/tooltip';

// import PriceAlertInput from '@/popup/components/PriceAlter';
// import { Direction } from '@/popup/components/PriceAlter';
// import AlertBadge from '@/popup/components/AlertBadge';
import { Header } from '@/popup/components/Header';
import { TokenSearch } from '@/popup/components/TokenSearch';
import { EmptyState } from '@/popup/components/EmptyState';
import { Footer } from '@/popup/components/Footer';
// import Checkbox from '@/components/common/checkbox';

import type { TokenItem } from '@/types/index';

// import { formatNumberWithCommas } from '@/utils/index';
// import { X, Power, PowerOff } from 'lucide-react';
import { useBatchTokenSelect } from '@/popup/hooks/useBatchTokenSelect';
import { usePriceAlerts } from '@/popup/hooks/usePriceAlerts';
import { useAutoScroll } from '@/popup/hooks/useAutoScroll';

import AssetItem from '@/popup/components/PopupHome/AssetItem';
import CheckBox from '@/popup/components/PopupHome/Checkbox';
import AlertDialog from '@/popup/components/PopupHome/AlertDialog';

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
  // const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);

  // 价格预计 hooks
  const { priceAlerts } = usePriceAlerts();

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

  // 批量删除币种 hooks
  const { batchSelect, selectedTokens, removing, handleToggleToken, removeToken } = useBatchTokenSelect({
    tokens,
    setCountdown,
    mutate
  });

  // 读取 price_alerts
  // useEffect(() => {
  //   const loadPriceAlerts = () => {
  //     chrome.storage.local.get('price_alerts', res => {
  //       const alerts = (res.price_alerts as PriceAlert[]) || [];
  //       setPriceAlerts(alerts);
  //     });
  //   };

  //   loadPriceAlerts();

  //   // 监听 storage 变化
  //   const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
  //     if (areaName === 'local' && changes.price_alerts) {
  //       loadPriceAlerts();
  //     }
  //   };

  //   chrome.storage.onChanged.addListener(handleStorageChange);

  //   // 监听消息通知
  //   const handleMessage = (msg: any) => {
  //     if (msg.type === 'PRICE_ALERTS_UPDATED') loadPriceAlerts();
  //   };

  //   chrome.runtime.onMessage.addListener(handleMessage);

  //   return () => {
  //     chrome.storage.onChanged.removeListener(handleStorageChange);
  //     chrome.runtime.onMessage.removeListener(handleMessage);
  //   };
  // }, []);

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
  const [alertToken, setAlertToken] = useState<TokenItem | null>(null);

  const setPriceAlert = () => {
    if (!menuToken) return;
    setAlertToken(menuToken);
    setShowPriceAlert(true);
    handleClose();
  };

  // 点击 AlertBadge 唤起弹窗
  const handleAlertBadgeClick = (token: TokenItem) => {
    setAlertToken(token);
    setShowPriceAlert(true);
  };

  // 添加币种后自动滚动到底部
  const listRef = useRef<HTMLDivElement>(null);
  useAutoScroll(tokens);

  return (
    <>
      <div className="w-full h-full font-mono bg-gray-900 text-white shadow-2xl backdrop-blur-lg p-3 flex flex-col">
        <Header />

        <TokenSearch tokens={tokens} onTokenAdded={handleTokenAdded} />

        <div ref={listRef} className="mt-5 overflow-auto flex-1 scrollbar-hide relative">
          {Array.isArray(tokens) && tokens.length > 0 ? (
            tokens.map((item: TokenItem) => {
              // 查找该币种对应的预警
              const alert = priceAlerts.find(a => a.symbol.toUpperCase() === item.symbol.toUpperCase());
              return (
                <div key={item.id} className="flex items-center">
                  <CheckBox visible={batchSelect.showCheckboxes} checked={selectedTokens.has(item.symbol)} onChange={checked => handleToggleToken(item.symbol, checked)} />

                  <AssetItem removing={removing} dataInfo={item} alertInfo={alert} onAlertClick={handleAlertBadgeClick} onMenuClick={handleOpen} />
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
      <AlertDialog open={showPriceAlert} token={alertToken} onClose={() => setShowPriceAlert(false)} />
    </>
  );
}
