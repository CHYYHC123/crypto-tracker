import type { AssetItem } from '@/types/asset';

function toAssetItem(symbol: string, price: number, changePercent: number): AssetItem {
  const sym = symbol.split('-')[0].toUpperCase();
  return {
    id: sym.toLowerCase(),
    symbol: sym,
    category: 'crypto' as const,
    price,
    change: Number(changePercent.toFixed(2)),
    lastPrice: 0
  };
}

/** Gate */
function parseGate(msg: any): AssetItem | null {
  if (msg?.channel !== 'spot.tickers' || msg?.event !== 'update') return null;
  const r = msg.result;
  if (!r) return null;

  return toAssetItem(
    r.currency_pair.replace('_', '-'),
    Number(r.last),
    Number(r.change_percentage)
  );
}

/** OKX */
function parseOKX(msg: any): AssetItem | null {
  if (msg?.arg?.channel !== 'tickers') return null;
  const d = msg.data?.[0];
  if (!d) return null;

  const last = Number(d.last);
  const open24h = Number(d.open24h);
  const changePercent = open24h > 0 ? ((last - open24h) / open24h) * 100 : 0;

  return toAssetItem(d.instId, last, changePercent);
}

/** Binance Crypto */
function parseBN(msg: any): AssetItem | null {
  if (msg?.e !== '24hrTicker') return null;

  const symbol = msg.s.endsWith('USDT') ? msg.s.slice(0, -4) + '-USDT' : msg.s;

  return toAssetItem(symbol, Number(msg.c), Number(msg.P));
}

/** Hyperliquid */
function parseHL(msg: any): AssetItem | null {
  if (msg?.channel !== 'candle' || !msg?.data) return null;

  const d = msg.data;
  const close = Number(d.c);
  const open = Number(d.o);

  if (!Number.isFinite(close) || !Number.isFinite(open)) return null;

  const changePercent = open > 0 ? ((close - open) / open) * 100 : 0;

  return toAssetItem(`${d.s}-USDT`, close, changePercent);
}

/** Binance Stock */
function parseBNStock(msg: any): AssetItem[] | null {
  if (msg?.stream !== 'price') return null;

  const rates: Array<{ s: string; p: string; pc: string; mp: string }> = msg?.data?.rates ?? [];
  if (!rates.length) return null;

  const result: AssetItem[] = [];

  for (const r of rates) {
    const price = Number(r.p);
    const prevClose = Number(r.pc);

    if (!r.s || isNaN(price) || price <= 0) continue;

    result.push({
      id: r.s.toLowerCase(),
      symbol: r.s,
      category: 'stocks',
      price,
      change: prevClose > 0 ? Number((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0,
      lastPrice: 0,
      marketPhase: r.mp ?? '',
      prevClose,
    });
  }

  return result.length ? result : null;
}

export function parseWSMessage(msg: any): AssetItem[] | null {
  const stock = parseBNStock(msg);
  if (stock) return stock;

  const crypto = parseGate(msg) || parseOKX(msg) || parseBN(msg) || parseHL(msg);
  return crypto ? [crypto] : null;
}
