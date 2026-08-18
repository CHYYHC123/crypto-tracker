import { useState, useRef, useEffect } from 'react';
import type { AssetItem } from '@/types/asset';

interface Options {
  tokens: AssetItem[];
  removing: boolean;
  mutate: () => Promise<AssetItem[] | undefined>;
}

/**
 * 管理列表骨架屏 loading 的生命周期，覆盖三个场景：
 *  1. 切换资产类型（crypto ↔ stocks）
 *  2. 删除 token
 *  3. 新增 token 由外部（handleTokenAdded）通过 setSkeletonLoading 触发(不触发骨架屏了)。
 */
export function useSkeletonLoading({ tokens, removing, mutate }: Options) {
  const [skeletonLoading, setSkeletonLoading] = useState(false);

  // 切换资产的时候，bg 链接成功后会发送 ASSET_TYPE_SWITCHED 消息，这时候可以拉去最新数据
  useEffect(() => {
    const handler = (msg: any) => {
      if (msg?.type !== 'ASSET_TYPE_SWITCHED') return;

      setSkeletonLoading(true);

      let retries = 0;
      const tryLoad = async () => {
        const result = await mutate();
        const hasPrice = result?.some((t: AssetItem) => t.price > 0);
        if (hasPrice || retries >= 5) {
          setTimeout(async () => {
            setSkeletonLoading(false);
            await mutate();
          }, 2000);
        } else {
          retries++;
          setTimeout(tryLoad, 1000);
        }
      };
      tryLoad();
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [mutate]);

  // 场景2：删除 token → 开始 loading；tokens 更新后结束
  const waitingForRemoveRef = useRef(false);
  useEffect(() => {
    if (removing) {
      waitingForRemoveRef.current = true;
      setSkeletonLoading(true);
    }
  }, [removing]);

  useEffect(() => {
    if (waitingForRemoveRef.current) {
      waitingForRemoveRef.current = false;
      setSkeletonLoading(false);
    }
  }, [tokens]);

  return { skeletonLoading, setSkeletonLoading };
}
