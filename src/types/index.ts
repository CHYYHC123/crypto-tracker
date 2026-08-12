export type TokenItem = {
  id: string;
  symbol: string;
  price: number | null;
  change: number | null;
  icon: string;
  lastPrice: number | 0;
};

// 统一资产类型，推荐使用 AssetItem 替代 TokenItem
export type { AssetItem, AssetCategory } from '@/types/asset';

export interface PriceAlert {
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export enum DataStatus {
  LIVE = 'live', // WebSocket 正常，实时
  DEGRADED = 'degraded', // WebSocket 挂了，使用降级数据
  OFFLINE = 'offline' // 无法获取任何数据
}

export interface GlobalAlerts {
  bull: string;
  bear: string;
  step: string;
  enabled: boolean;
}

export interface GlobalAlertsTrigger {
  upCount: number;
  downCount: number;
  lastTriggerAt: number;
  lastDecayAt: number;
}

export type AssetTypes = 'crypto' | 'stocks';
