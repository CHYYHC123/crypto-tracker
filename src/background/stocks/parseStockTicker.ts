export interface StockItem {
  id: string; // lowercase symbol, e.g. 'aapl'
  symbol: string; // 'AAPL'
  price: number;
  prevClose: number; // yesterday's close (pc)
  change: number;
  marketPhase: string; // 'C' | 'ON' | 'PRE' | 'POST'
  lastPrice: number; // previous price snapshot for flash animation
}

interface StockRateRaw {
  s: string; // 股票代码
  p: string; // 最新价格
  pc: string; // 昨收价格
  tc: string; // 
  mp: string; // 市场阶段
  t: number; // 时间戳
}

/**
 * 解析币安股票 WS 推送的 price 流消息
 * 消息结构：{ stream: 'price', data: { rates: [{ s, p, pc, tc, mp, t }] } }
 * 返回当次推送中所有有效股票条目（已过滤无效价格）
 */
export function parseStockMessage(data: any): StockItem[] | null {
  if (data?.stream !== 'price') return null;

  const rates: StockRateRaw[] = data?.data?.rates ?? [];

  if (!rates.length) return null;

  const result: StockItem[] = [];

  for (const r of rates) {
    const price = Number(r.p);
    const prevClose = Number(r.pc);

    if (!r.s || isNaN(price) || price <= 0) continue;

    const changePercent = prevClose > 0 ? Number((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0;

    result.push({
      id: r.s.toLowerCase(),
      symbol: r.s,
      price,
      prevClose,
      change: changePercent,
      marketPhase: r.mp ?? '',
      lastPrice: 0
    });
  }

  return result.length ? result : null;
}
