import { useState, useRef, useEffect } from 'react';
import type { AssetItem } from '@/types/asset';

interface Options {
  modeType: string;
  assetTypeInitLoading: boolean;
  tokens: AssetItem[];
  removing: boolean;
  mutate: () => Promise<AssetItem[] | undefined>;
}

/**
 * 管理列表骨架屏 loading 的生命周期，覆盖三个场景：
 *  1. 切换资产类型（crypto ↔ stocks）
 *  2. 删除 token
 * 新增 token 由外部（handleTokenAdded）通过 setSkeletonLoading 触发。
 *
 * Bug 修复：
 *  - popup 首次打开误触发 loading：用 null 哨兵等待 assetTypeInitLoading 完成
 *  - crypto 切换后价格等 10s：ASSET_TYPE_SWITCHED 改为轮询直到拿到非零价格
 */
export function useSkeletonLoading({ modeType, assetTypeInitLoading, tokens, removing, mutate }: Options) {
  const [skeletonLoading, setSkeletonLoading] = useState(false);

  // ─── 场景1：切换资产类型 → 开始 loading
  // 用 null 哨兵：assetTypeInitLoading 完成前不监测变化，
  // 防止"初始加载时默认值 → 真实值"被误判为切换
  const prevModeRef = useRef<string | null>(null);
  useEffect(() => {
    if (assetTypeInitLoading) return;

    if (prevModeRef.current === null) {
      // 初始化刚完成，记录真实初始值，不触发 loading
      prevModeRef.current = modeType;
      return;
    }

    if (prevModeRef.current !== modeType) {
      prevModeRef.current = modeType;
      setSkeletonLoading(true);
    }
  }, [modeType, assetTypeInitLoading]);

  // ─── 场景1：ASSET_TYPE_SWITCHED 消息 → 先开启骨架屏，轮询直到有真实价格
  // 修复 crypto 切换后因无 REST 快照而显示全 0 的问题：
  // 轮询 mutate 直到拿到非零价格，最多重试 5 次（约 10s 保底）
  useEffect(() => {
    const handler = (msg: any) => {
      if (msg?.type !== 'ASSET_TYPE_SWITCHED') return;

      setSkeletonLoading(true);

      let retries = 0;
      const tryLoad = async () => {
        const result = await mutate();
        const hasPrice = result?.some((t: AssetItem) => t.price > 0);
        if (hasPrice || retries >= 5) {
          setSkeletonLoading(false);
        } else {
          retries++;
          setTimeout(tryLoad, 2000);
        }
      };
      tryLoad();
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [mutate]);

  // ─── 场景2：删除 token → 开始 loading；tokens 更新后结束
  // removing 在 finally 中被清除（比 mutate 的 1.5s 延迟更早），
  // 必须用 ref 标记"等待状态"，等 tokens 真正变化再清除 loading
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
