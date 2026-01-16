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
    <div className=" px-3 py-2 bg-gray-900 border-t border-white/5 flex justify-between items-center text-[10px] z-10">
      <div>
        <NetworkState status={status} />
      </div>
      <button onClick={onRefresh} className="px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer">
        Refresh
      </button>
    </div>
  );
});
