// 获取 OKX、币安、Gate 现货 USDT 币种对，去重合并写入 tokens.ts
// platform 使用位运算 (Bitmask): BN=1 (2^0), OKX=2 (2^1), Gate=4 (2^2)
// 示例: { symbol: 'BTC', platform: 7 } 表示三个交易所均支持

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrl = 'http://127.0.0.1:7897';
const proxy = new HttpsProxyAgent(proxyUrl);

const OKX_API  = 'https://www.okx.com/api/v5/public/instruments?instType=SPOT';
const BN_API   = 'https://api.binance.com/api/v3/exchangeInfo';
const GATE_API = 'https://api.gateio.ws/api/v4/spot/currency_pairs';

const PLATFORM = { BN: 1, OKX: 2, GATE: 4 };

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const rootDir    = path.join(__dirname, '..');
const utilsDir   = path.join(rootDir, 'src/utils');
const outputPath = path.join(utilsDir, 'tokens.ts');

// 仅保留纯 USDT 计价，排除 USDC / USDE / USDT1 等其他稳定币
function isUSDTQuote(quote) {
  return quote.toUpperCase() === 'USDT';
}

async function fetchOKX() {
  console.log('⏳ 正在请求 OKX...');
  const res  = await fetch(OKX_API, { agent: proxy });
  const body = await res.json();
  if (body.code !== '0') throw new Error('OKX 接口异常: ' + body.msg);

  const tokens = new Set();
  for (const item of body.data) {
    // instId 格式: BTC-USDT
    const parts = item.instId.split('-');
    if (parts.length >= 2 && isUSDTQuote(parts[1])) {
      tokens.add(parts[0].toUpperCase());
    }
  }
  console.log(`✅ OKX: ${tokens.size} 个`);
  return tokens;
}

async function fetchBinance() {
  console.log('⏳ 正在请求 Binance...');
  const res  = await fetch(BN_API, { agent: proxy });
  const body = await res.json();

  const tokens = new Set();
  for (const item of body.symbols) {
    // status 必须为 TRADING，quoteAsset 精确匹配 USDT
    if (item.status === 'TRADING' && isUSDTQuote(item.quoteAsset)) {
      tokens.add(item.baseAsset.toUpperCase());
    }
  }
  console.log(`✅ Binance: ${tokens.size} 个`);
  return tokens;
}

async function fetchGate() {
  console.log('⏳ 正在请求 Gate.io...');
  const res  = await fetch(GATE_API, { agent: proxy });
  const body = await res.json();

  const tokens = new Set();
  for (const item of body) {
    // id 格式: BTC_USDT，trade_status 需为 tradable
    const parts = item.id.split('_');
    if (
      parts.length >= 2 &&
      isUSDTQuote(parts[1]) &&
      item.trade_status === 'tradable'
    ) {
      tokens.add(parts[0].toUpperCase());
    }
  }
  console.log(`✅ Gate.io: ${tokens.size} 个`);
  return tokens;
}

async function main() {
  const [okxTokens, bnTokens, gateTokens] = await Promise.all([
    fetchOKX(),
    fetchBinance(),
    fetchGate(),
  ]);

  // 合并所有 symbol：Gate 独有的（BN 和 OKX 都没有）直接过滤，避免收录垃圾币
  const allSymbols = new Set([...okxTokens, ...bnTokens, ...gateTokens]);

  const result = Array.from(allSymbols)
    .filter((symbol) => {
      const onlyGate = gateTokens.has(symbol) && !bnTokens.has(symbol) && !okxTokens.has(symbol);
      return !onlyGate;
    })
    .sort()
    .map((symbol) => {
      let platform = 0;
      if (bnTokens.has(symbol))   platform |= PLATFORM.BN;
      if (okxTokens.has(symbol))  platform |= PLATFORM.OKX;
      if (gateTokens.has(symbol)) platform |= PLATFORM.GATE;
      return { symbol, platform };
    });

  const content =
`// 此文件由 scripts/getToken.js 自动生成，请勿手动修改
// 更新时间: ${new Date().toLocaleString()}
// platform 位运算: BN=1, OKX=2, Gate=4  （示例: 7 = 全部支持, 6 = OKX+Gate）
export const SUPPORTED_TOKENS = ${JSON.stringify(result, null, 2)} as const;

export type TokenItem = typeof SUPPORTED_TOKENS[number];
export type TokenSymbol = TokenItem['symbol'];
`;

  fs.mkdirSync(utilsDir, { recursive: true });
  fs.writeFileSync(outputPath, content, 'utf-8');

  const gateOnlyCount = [...gateTokens].filter((s) => !bnTokens.has(s) && !okxTokens.has(s)).length;
  console.log(`\n🎉 共写入 ${result.length} 个 USDT 币种到 ${outputPath}`);
  console.log(
    `   BN: ${bnTokens.size}  OKX: ${okxTokens.size}  Gate: ${gateTokens.size}  Gate独有(已过滤): ${gateOnlyCount}  最终写入: ${result.length}`,
  );
}

main().catch(console.error);
