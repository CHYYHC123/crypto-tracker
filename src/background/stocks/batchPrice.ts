const SYMBOLS_DYNAMIC_URL = 'https://www.binance.com/bapi/equity/v1/public/equity/symbol/get-symbols-dynamic';

export interface DynamicData {
  ac: string;   // 带前缀 ticker，如 "EQ_AAPL"
  c: string;    // 当前价（current price）
  tc: string | null;
  pc: string;   // 昨日收盘价（prev close）
  lrc: string;  // 上次常规收盘（last regular close）
  prc: string;  // 前一个常规收盘
  v24: string;  // 24h 成交量
  ta: string;   // 总金额
  mp: string;   // 市场阶段，如 "ON" | "PRE" | "POST" | "C"
}

function acToSymbol(ac: string): string {
  return ac.replace(/^EQ_/, '');
}

// 获取股票批量快照价格，返回命中 assetSet 的条目
export async function getBatchPrice(assetSet: Set<string>): Promise<DynamicData[]> {
  try {
    const response = await fetch(SYMBOLS_DYNAMIC_URL);
    const result = await response.json();
    if (!result || !Array.isArray(result.data)) return [];
    return result.data.filter((item: DynamicData) => assetSet.has(acToSymbol(item.ac).toUpperCase()));
  } catch (error) {
    console.error('[BatchPrice] 获取股票价格失败:', error);
    return [];
  }
}
