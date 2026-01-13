import type { ExchangeType } from '@/config/exchangeConfig';
import { defaultDataSource } from '@/config/exchangeConfig';
import { queryTokenLocal } from '@/utils/index';

/**
 * 查询当前连接的网络是否是大陆
 */
async function queryIpCN(): Promise<boolean> {
  try {
    const ipinfo = await fetch('https://ipapi.co/json/').then(r => r.json());
    if (ipinfo.country === 'CN') return true;
    return false;
  } catch (err) {
    return true;
  }
}

/**
 * 查询是否是有效token（OKX API）
 * https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT
 * @param symbol 要查询的token BTC、ETH
 */
async function queryToken(symbol: string): Promise<boolean> {
  try {
    const queryUrl = 'https://www.okx.com/api/v5/market/ticker';
    const res = await fetch(`${queryUrl}?instId=${symbol}-USDT`);
    const data = await res.json();
    if (data.code === '0') return true;
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * 验证币种是否有效
 * 根据不同数据源选择不同的验证方式
 * @param symbol 要验证的币种
 * @param dataSource 数据源，默认为 OKX
 * @param useLocal 是否强制使用本地验证，如果为 true 则直接走本地验证，不进行 queryIpCN 查询，默认为 false
 * @returns 是否有效
 */
export async function validateToken(symbol: string, dataSource: ExchangeType = defaultDataSource, useLocal: boolean = false): Promise<boolean> {
  // 如果指定使用本地验证，直接返回本地验证结果
  if (useLocal) {
    return queryTokenLocal(symbol);
  }

  // 如果 IP 是 CN，使用本地验证（保持原有逻辑）
  const isIpCN = await queryIpCN();
  if (isIpCN) {
    return queryTokenLocal(symbol);
  }

  // 如果 IP 不是 CN，根据不同数据源选择不同的验证方式
  // 预留字段：可以根据数据源扩展不同的 queryToken 实现
  switch (dataSource) {
    case 'OKX':
      return await queryToken(symbol);
    case 'Gate':
      // TODO: 实现 Gate 的验证逻辑
      // 例如：return await queryTokenGate(symbol);
      return await queryToken(symbol); // 暂时使用 OKX 的方式
    case 'BN':
      // TODO: 实现 Binance 的验证逻辑
      // 例如：return await queryTokenBinance(symbol);
      return await queryToken(symbol); // 暂时使用 OKX 的方式
    case 'HL':
      // TODO: 实现 Hyperliquid 的验证逻辑
      // 例如：return await queryTokenHyperliquid(symbol);
      return await queryToken(symbol); // 暂时使用 OKX 的方式
    default:
      // 默认使用 OKX 的验证方式
      return await queryToken(symbol);
  }
}
