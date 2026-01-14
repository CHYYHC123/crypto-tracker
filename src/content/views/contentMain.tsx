import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Minus } from 'lucide-react';

import { formatNumberWithCommas } from '@/utils/index';

// 组件
import DraggableContent from '@/components/DraggableContent/index';
import { CustomToaster } from '@/components/CustomToaster/index';
import { CoinsContent, SortableCoinItem, CoinsFooter } from '@/content/views/coins';
import NetworkState from '@/content/views/networkState';
import AlertBadge from '@/popup/components/AlertBadge';
import Badge from '@/components/common/badge';

// hooks
import { usePriceAlertManager } from '@/hooks/usePriceAlertManager';
import { useDataStatus } from '@/hooks/useDataStatus';
import { useIsMobile } from '@/hooks/useIsMobile';

// type
import { DataStatus } from '@/types/index';
import { TokenItem, PriceAlert } from '@/types/index';

// dnd-kit
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';

export default function ContentMain() {
  const [collapsed, setCollapsed] = useState(true);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);

  const contentRef = useRef<HTMLDivElement | null>(null); // 绑定到 motion.div
  const [contentHeight, setContentHeight] = useState<number>(0);

  /**
   * 移动端隐藏token表
   */
  const isMobile = useIsMobile();

  // 网络状态
  const status = useDataStatus();

  // 管理预警消息
  usePriceAlertManager(tokens);

  // 是否正在排序拖拽（用于禁用外层拖拽）
  const [isSorting, setIsSorting] = useState(false);

  // dnd-kit 传感器配置
  // 使用 delay 而非 distance，避免和外层 motion.div 拖拽冲突
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200, // 按住 200ms 后才激活排序
        tolerance: 5 // 允许 5px 的移动容差
      }
    })
  );

  // 内容高度
  useLayoutEffect(() => {
    if (!collapsed && contentRef.current) {
      // 读取 auto 时真实高度
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [collapsed, tokens?.length]);

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

  // 监听价格更新
  useEffect(() => {
    // 监听 background.js 发来的消息
    function handleMessage(msg: any) {
      if (msg.type === 'UPDATE_PRICE' && msg.data) {
        setTokens(prevTokens => {
          // 如果是首次加载或数量变化，直接使用新数据
          if (!prevTokens.length || prevTokens.length !== msg.data.length) return msg.data;

          // 优化：使用 Map 将查找复杂度从 O(n*m) 降为 O(n)
          const updatedMap = new Map<string, TokenItem>();
          msg.data.forEach((token: TokenItem) => {
            updatedMap.set(token.symbol.toUpperCase(), token);
          });

          // 保持当前顺序，只更新价格
          let hasChanges = false;
          const newTokens = prevTokens.map(token => {
            const updated = updatedMap.get(token.symbol.toUpperCase());
            if (!updated) return token; // 找不到对应 token，保持原样

            // 优化：只有价格、涨跌幅或 lastPrice 真正变化时才创建新对象
            const priceChanged = updated.price !== token.price;
            const changeChanged = updated.change !== token.change;
            const lastPriceChanged = updated.lastPrice !== token.lastPrice;

            if (priceChanged || changeChanged || lastPriceChanged) {
              hasChanges = true;
              return { ...token, price: updated.price, change: updated.change, lastPrice: updated.lastPrice };
            }

            // 数据没有变化，保持原对象引用（有利于 React.memo）
            return token;
          });

          // 优化：如果所有 token 都无变化，直接返回 prevTokens，避免触发 setState
          return hasChanges ? newTokens : prevTokens;
        });
      }
    }
    chrome.runtime.onMessage.addListener(handleMessage);

  // 卸载组件时移除监听
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  /**
   * 1、监听页面可见性变化，当页面从隐藏变为可见时，通知 background 主动推送数据
   * 2、初次渲染后，3s后查看是否有数据推送如果没有就重新拉取一次
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) chrome.runtime.sendMessage({ type: 'CONTENT_RESYNC' });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'CONTENT_RESYNC' });
    }, 3000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 排序开始
  const handleSortStart = () => {
    setIsSorting(true);
  };

  // 处理拖拽结束
  const handleSortEnd = (event: DragEndEvent) => {
    setIsSorting(false);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTokens(items => {
        const oldIndex = items.findIndex(item => item.symbol === active.id);
        const newIndex = items.findIndex(item => item.symbol === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // 通知 Background 更新顺序（不触发 WebSocket 重连）
        const newOrder = newItems.map(item => item.symbol);
        chrome.runtime.sendMessage({ type: 'REORDER_TOKENS', payload: { order: newOrder } });

        return newItems;
      });
    }
  };

  // 手动刷新
  const refreshData = () => {
    chrome.runtime.sendMessage({ type: 'REFRESH', payload: { falg: true } }, response => {
      if (response.success) {
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

  return (
    <>
      {!isMobile && (
        <DraggableContent disabled={isSorting}>
          <CustomToaster />

          <CoinsContent>
            <div className="flex justify-between items-center p-3 cursor-move sticky top-0 bg-gray-900 backdrop-blur-lg z-10">
              {collapsed && tokens?.length > 0 ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-base font-medium">{tokens[0]?.icon}</div>
                    <div className="ml-2">
                      <div className="text-xs font-medium">{tokens[0]?.symbol}</div>
                      {(() => {
                        const alert = priceAlerts.find(a => a.symbol.toUpperCase() === tokens[0]?.symbol.toUpperCase());
                        return alert ? <AlertBadge AlertInfo={alert} /> : <div className="text-[10px] opacity-60">{tokens[0]?.id}</div>;
                      })()}
                    </div>
                  </div>

                  {status !== DataStatus.LIVE ? (
                    <div style={{ marginRight: '12px' }} onClick={refreshData}>
                      <NetworkState status={status} className="cursor-pointer" />
                    </div>
                  ) : (
                    <div style={{ marginRight: '12px' }}>
                      <div className="text-xs font-semibold">{formatNumberWithCommas(tokens[0].price!)}</div>
                      <div className={`text-[10px] ${tokens[0]?.change! >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{tokens[0]?.change! >= 0 ? '+' + tokens[0]?.change + '%' : tokens[0]?.change + '%'}</div>
                    </div>
                  )}
                </div>
              ) : (
                <h2 className="text-sm font-semibold text-sans">Crypto Prices</h2>
              )}

              <div className="flex gap-2 items-center">
                <button onClick={() => setCollapsed(!collapsed)} className="text-xs px-1 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer">
                  {collapsed ? <Plus size={12} /> : <Minus size={12} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  ref={contentRef}
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: contentHeight || 'auto',
                    opacity: 1,
                    transitionEnd: { height: 'auto' } //动画完后设回 auto，保证自适应
                  }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.3, ease: 'easeInOut' },
                    opacity: { duration: 0.2, ease: 'easeInOut' }
                  }}
                  className="px-3 pt-2 pb-0 space-y-2"
                >
                  {/* 拖拽列表容器 - restrictToParentElement 会限制在这个容器内 */}
                  <div className="space-y-2">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragStart={handleSortStart} onDragEnd={handleSortEnd}>
                      <SortableContext items={tokens.map(t => t.symbol)} strategy={verticalListSortingStrategy}>
                        {tokens?.map((coin: TokenItem) => (
                          <SortableCoinItem key={coin.symbol} coin={coin} priceAlerts={priceAlerts} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && <CoinsFooter status={status} onRefresh={refreshData} />}
          </CoinsContent>
        </DraggableContent>
      )}
    </>
  );
}
