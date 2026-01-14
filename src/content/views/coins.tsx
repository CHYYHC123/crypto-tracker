import { memo } from 'react';
import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { formatNumberWithCommas } from '@/utils/index';
import { TokenItem, PriceAlert, DataStatus } from '@/types/index';
import AlertBadge from '@/popup/components/AlertBadge';
import NetworkState from '@/content/views/networkState';

export type CoinsContentProps = ComponentProps<typeof motion.div>;

export const CoinsContent = ({ className, ...props }: CoinsContentProps) => (
  <motion.div layout className={cn('relative w-60 max-h-[50vh] overflow-y-auto bg-gray-900 text-white rounded-2xl shadow-2xl backdrop-blur-lg scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent scrollbar-hide', className)} {...props} />
);

// 可排序的币种卡片组件
interface SortableCoinItemProps {
  coin: TokenItem;
  priceAlerts: PriceAlert[];
}

// 自定义对比函数：只有价格、涨跌幅或预警状态变化时才重新渲染
function arePropsEqual(prevProps: SortableCoinItemProps, nextProps: SortableCoinItemProps): boolean {
  const prevCoin = prevProps.coin;
  const nextCoin = nextProps.coin;

  // 比较价格（使用 price_show 格式化后的值进行比较，避免浮点数精度问题）
  if (prevCoin.price !== nextCoin.price) return false;

  // 比较涨跌幅
  if (prevCoin.change !== nextCoin.change) return false;

  // 比较预警状态：查找该币种对应的预警，比较预警的关键属性
  const prevAlert = prevProps.priceAlerts.find(a => a.symbol.toUpperCase() === prevCoin.symbol.toUpperCase());
  const nextAlert = nextProps.priceAlerts.find(a => a.symbol.toUpperCase() === nextCoin.symbol.toUpperCase());

  // 如果预警存在状态不同（一个有预警一个没有），需要重新渲染
  if (!!prevAlert !== !!nextAlert) return false;

  // 如果都有预警，比较预警的关键属性（enabled, targetPrice, direction）
  if (prevAlert && nextAlert) {
    if (prevAlert.enabled !== nextAlert.enabled) return false;
    if (prevAlert.targetPrice !== nextAlert.targetPrice) return false;
    if (prevAlert.direction !== nextAlert.direction) return false;
  }

  // 其他属性（symbol, icon 等）变化不影响渲染，因为它们在组件生命周期内不会改变
  return true;
}

// 可排序的币种卡片组件
export const SortableCoinItem = memo(function SortableCoinItem({ coin, priceAlerts }: SortableCoinItemProps) {
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
}, arePropsEqual);

// 底部操作栏组件
interface CoinsFooterProps {
  /** 网络状态 */
  status: DataStatus;
  /** 刷新数据回调 */
  onRefresh: () => void;
}

export const CoinsFooter = ({ status, onRefresh }: CoinsFooterProps) => {
  return (
    <div className="sticky bottom-0 px-3 py-2 bg-gray-900 border-t border-white/5 flex justify-between items-center text-[10px] z-10">
      <div>
        <NetworkState status={status} />
      </div>
      <button onClick={onRefresh} className="px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer">
        Refresh
      </button>
    </div>
  );
};
