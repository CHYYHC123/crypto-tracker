/** 统一资产类型（UI mode 与运行时 category 共用） */
export type AssetTypes = 'crypto' | 'stocks';

/**
 * 统一资产运行时展示模型（替换 TokenItem 与 StockItem）
 * 两种资产类型的数据差异在各自的 parser 层归一，上层统一消费此类型
 */
export interface AssetItem {
  id: string; // 规范化 ID，格式: `${symbol.toLowerCase()}`
  symbol: string; // 展示符号，如 "BTC"、"AAPL"
  category: AssetTypes;
  price: number;
  change: number; // 涨跌幅（%）
  lastPrice: number; // 上一次价格快照，用于闪烁动画

  // 股票独有（可选）
  marketPhase?: string; // 'C' | 'ON' | 'PRE' | 'POST'
  prevClose?: number; // 昨日收盘价
}

/** 预警规则模型 */
export interface AlertRule {
  id: string;
  assetId: string;
  targetPrice: number;
  condition: 'gt' | 'lt';
  isEnabled: boolean;
  createdAt: number;
}
