import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatNumberWithCommas } from '@/utils/index';
import { Plus, Minus, GripVertical } from 'lucide-react';
import { CustomToaster } from '@/components/CustomToaster/index';
import NetworkState from '@/content/views/networkState';
import { DataStatus } from '@/types/index';

import { usePriceAlertManager } from '@/hooks/usePriceAlertManager';
import { useDataStatus } from '@/hooks/useDataStatus';

import { TokenItem, PriceAlert } from '@/types/index';
import AlertBadge from '@/popup/components/AlertBadge';

// dnd-kit
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';

// 可排序的币种卡片组件
interface SortableCoinItemProps {
  coin: TokenItem;
  priceAlerts: PriceAlert[];
}

// 可排序的币种卡片组件
function SortableCoinItem({ coin, priceAlerts }: SortableCoinItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: coin.symbol });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 100 : 1
  };

  // 查找该币种对应的预警
  const alert = priceAlerts.find(a => a.symbol.toUpperCase() === coin.symbol.toUpperCase());

  return (
    <div ref={setNodeRef} style={style} className={`flex justify-between items-center bg-white/5 hover:bg-white/10 p-2 rounded-lg transition ${isDragging ? 'shadow-lg' : ''}`}>
      {/* 拖拽手柄 - 阻止事件冒泡到外层 motion.div */}
      <div
        {...attributes}
        {...listeners}
        onPointerDown={e => {
          e.stopPropagation();
          // 调用原始的 onPointerDown
          listeners?.onPointerDown?.(e as any);
        }}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 mr-1 text-white/30 hover:text-white/60 transition touch-none"
      >
        <GripVertical size={14} />
      </div>

      <div className="flex items-center gap-2 flex-1">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-base font-medium">{coin.icon}</div>
        <div>
          <div className="text-xs font-medium">{coin.symbol}</div>
          {alert ? <AlertBadge AlertInfo={alert} /> : <div className="text-[10px] opacity-60">{coin.symbol}</div>}
        </div>
      </div>
      <div className="text-right mr-1">
        <div className="text-xs font-semibold">{formatNumberWithCommas(coin.price ?? 0)}</div>
        <div className={`text-[10px] ${coin.change === null ? 'text-gray-400' : coin.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{coin.change === null ? '—' : coin.change >= 0 ? '+' + coin.change + '%' : coin.change + '%'}</div>
      </div>
    </div>
  );
}

export default function FloatingCryptoWidget() {
  const [collapsed, setCollapsed] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const widgetRef = useRef<HTMLDivElement | null>(null);

  const contentRef = useRef<HTMLDivElement | null>(null); // 绑定到 motion.div
  const [contentHeight, setContentHeight] = useState<number>(0);

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
          if (!prevTokens.length || prevTokens.length !== msg.data.length) {
            return msg.data;
          }
          // 保持当前顺序，只更新价格
          return prevTokens.map(token => {
            const updated = msg.data.find((t: TokenItem) => t.symbol === token.symbol);
            return updated ? { ...token, price: updated.price, change: updated.change, lastPrice: updated.lastPrice } : token;
          });
        });
      }
    }
    chrome.runtime.onMessage.addListener(handleMessage);
    // 卸载组件时移除监听
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // 网络状态
  const status = useDataStatus();

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

  /**
   * 移动端隐藏token表
   */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 500);
    };

    handleResize(); // 初始化执行一次
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
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

  // 设置拖拽位置
  const snapToEdge = (x: number, y: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const widgetWidth = widgetRef.current?.offsetWidth || 300;
    const widgetHeight = widgetRef.current?.offsetHeight || 200;

    const margin = 16;

    const newY = Math.min(Math.max(y, margin), vh - widgetHeight - margin);

    if (x < vw / 2) {
      setPosition({ x: -vw / 2 + margin, y: newY - vh + widgetHeight });
    } else {
      setPosition({
        x: vw / 2 - widgetWidth - margin,
        y: newY - vh + widgetHeight
      });
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    snapToEdge(info.point.x, info.point.y);
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
        <motion.div
          ref={widgetRef}
          drag={!isSorting}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 right-4 z-99999999"
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          translate="no"
          data-notranslate="true"
        >
          <CustomToaster />
          <motion.div layout className="w-60 max-h-[50vh] overflow-y-auto bg-gray-900 text-white rounded-2xl shadow-2xl backdrop-blur-lg border border-white/10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent scrollbar-hide">
            <div className="flex justify-between items-center p-3 cursor-move sticky top-0 bg-gray-900 backdrop-blur-lg z-10">
              {collapsed && tokens?.length > 0 ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-base font-medium">{tokens[0]?.icon}</div>
                    <div className="ml-2">
                      <div className="text-xs font-medium">{tokens[0]?.symbol}</div>
                      {(() => {
                        const alert = priceAlerts.find(a => a.symbol.toUpperCase() === tokens[0]?.symbol.toUpperCase());
                        console.log('alert', alert);
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

            {/* 底部操作栏 - 固定在底部，收起时隐藏 */}
            {!collapsed && (
              <div className="sticky bottom-0 px-3 py-2 bg-gray-900 border-t border-white/5 flex justify-between items-center text-[10px] ">
                <div>
                  <NetworkState status={status} />
                </div>
                <button onClick={refreshData} className="px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer">
                  Refresh
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
