import { Loader } from 'lucide-react';

interface RefreshFooterProps {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 倒计时秒数 */
  countdown: number;
  /** 刷新按钮点击回调 */
  onRefresh: () => void;
}

export const Footer = ({ isLoading, countdown, onRefresh }: RefreshFooterProps) => {
  return (
    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 flex-shrink-0">
      <div className="text-xs text-white/50">{isLoading ? <Loader className="animate-spin" size={12} /> : `${countdown}s`}</div>
      <button className="px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer text-xs" onClick={onRefresh}>
        Refresh
      </button>
    </div>
  );
};

