import { memo } from 'react';
import { DataStatus } from '@/types/index';
import NetworkState from '@/content/components/networkState';
// 底部操作栏组件
interface CoinsFooterProps {
  /** 网络状态 */
  status: DataStatus;
  /** 刷新数据回调 */
  onRefresh: () => void;
}

export const CoinsFooter = memo(({ status, onRefresh }: CoinsFooterProps) => {
  return (
    <div className=" px-3 py-2 bg-background border-t border-border flex justify-between items-center text-[10px] z-10">
      <NetworkState status={status} />

      <button onClick={onRefresh} className="px-2 py-1 bg-surface rounded-md hover:bg-surface-hover transition cursor-pointer">
        Refresh
      </button>
    </div>
  );
});
