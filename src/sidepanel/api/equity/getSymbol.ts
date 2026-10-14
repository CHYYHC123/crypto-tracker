const GET_SYMBOL_URL =
  'https://www.binance.com/bapi/equity/v1/public/equity/symbol/get-symbol';

export interface EquitySymbolInfo {
  symbol: string;
  name: string;
  assetCode: string;
  price: number;
  prevClose: number;
  changePercent: number;
  marketPhase?: string;
}

interface GetSymbolResponse {
  code: string;
  data?: {
    s?: string;
    n?: string;
    ac?: string;
    c?: string;
    pc?: string;
    mp?: string;
    lrc?: string;
  } | null;
}

function toAssetCode(symbol: string): string {
  const upper = symbol.toUpperCase();
  return upper.startsWith('EQ_') ? upper : `EQ_${upper}`;
}

/** 单标的详情：全名 + 现价/昨收快照 */
export async function fetchEquitySymbol(
  symbol: string,
  signal?: AbortSignal
): Promise<EquitySymbolInfo | null> {
  try {
    const assetCode = toAssetCode(symbol);
    const url = `${GET_SYMBOL_URL}?assetCode=${encodeURIComponent(assetCode)}`;
    const res = await fetch(url, { signal });
    const body = (await res.json()) as GetSymbolResponse;

    if (!res.ok || body.code !== '000000' || !body.data) return null;

    const d = body.data;
    const price = Number(d.lrc);
    const prevClose = Number(d.pc);
    if (!Number.isFinite(price) || price <= 0) return null;

    const changePercent =
      Number.isFinite(prevClose) && prevClose > 0
        ? Number((((price - prevClose) / prevClose) * 100).toFixed(2))
        : 0;

    return {
      symbol: String(d.s ?? symbol).toUpperCase(),
      name: String(d.n ?? ''),
      assetCode: String(d.ac ?? assetCode),
      price,
      prevClose: Number.isFinite(prevClose) ? prevClose : 0,
      changePercent,
      marketPhase: d.mp
    };
  } catch {
    // abort / 网络错误 → 不抛到 UI
    return null;
  }
}
