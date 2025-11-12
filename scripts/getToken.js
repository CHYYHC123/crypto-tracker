// 获取 okx 现货币种对
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
const OKX_API = 'https://www.okx.com/api/v5/public/instruments?instType=SPOT';
const proxyUrl = 'http://127.0.0.1:7897'; // 这里改为你的代理地址
const proxy = new HttpsProxyAgent(proxyUrl);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// console.log('__dirname', __dirname);
const rootDir = path.join(__dirname, '..');
// console.log('rootDir', rootDir);
const utilsDir = path.join(rootDir, 'src/utils');
const outputPath = path.join(utilsDir, 'tokens.ts');

async function fetchUSDTBaseTokens() {
  const res = await fetch(OKX_API, { agent: proxy });
  const body = await res.json();

  if (body.code !== '0') throw new Error('OKX接口返回异常：' + body.msg);

  const tokenSet = new Set();
  for (const item of body.data) {
    // instId 格式: BTC-USDT、PEPE-USDT
    if (item.instId.endsWith('-USDT')) {
      const base = item.instId.split('-')[0];
      tokenSet.add(base);
    }
  }
  // 转成数组，排序（可选）
  const tokens = Array.from(tokenSet).sort();
  // 生成 TypeScript 内容
  const content = `// 此文件由 getToken.js 自动生成
  // 更新时间: ${new Date().toLocaleString()}
  export const SUPPORTEDTOKEN = ${JSON.stringify(tokens, null, 2)} as const;
  export type TokenSymbol = typeof SUPPORTEDTOKEN[number];
  `;

  // 确保目录存在
  fs.mkdirSync(utilsDir, { recursive: true });
  // 写入文件
  fs.writeFileSync(outputPath, content, 'utf-8');

  console.log(`✅ 已写入 ${tokens.length} 个 USDT 币种到 ${outputPath}`);
}

fetchUSDTBaseTokens().catch(console.error);
