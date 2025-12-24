export type TokenItem = {
  id: string;
  symbol: string;
  price: number | null;
  change: number | null;
  icon: string;
  lastPrice: number | 0;
};

export interface PriceAlert {
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export enum DataStatus {
  LIVE = 'live',        // WebSocket 正常，实时
  DEGRADED = 'degraded',// WebSocket 挂了，使用降级数据
  OFFLINE = 'offline'   // 无法获取任何数据
}