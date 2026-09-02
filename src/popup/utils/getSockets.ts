const SYMBOLS_STATIC_URL = 'https://www.binance.com/bapi/equity/v1/public/equity/symbol/get-symbols-static';
const IMG_BASE = 'https://bin.bnbstatic.com/static/stock/';

export interface EquitySymbol {
  ac: string;
  symbol: string;
  desc: string;
  img: string;
  sector: string;
}

let cache: EquitySymbol[] | null = null;

export async function fetchEquitySymbols(): Promise<EquitySymbol[] | null> {
  if (cache) return cache;
  try {
    const res = await fetch(SYMBOLS_STATIC_URL);
    const json = await res.json();
    if (json.code === '000000' && Array.isArray(json.data) && json.data.length > 0) {
      cache = json.data.map((item: { ac: string; s: string; n: string; l: string; ssi?: string }) => ({
        ac: item.ac,
        symbol: item.s,
        desc: item.n,
        img: IMG_BASE + item.l,
        sector: item.ssi ?? '',
      }));
      return cache;
    }
  } catch {}
  return null;
}
