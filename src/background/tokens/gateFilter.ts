/**
 * Gate.io 代币支持性过滤器
 *
 * Gate 的 WS 订阅策略是"整批拒绝"：payload 中只要有一个无效交易对，
 * 整条订阅消息都会失败，导致所有代币收不到数据。
 * 因此连接 Gate 前必须主动过滤不支持的代币。
 *
 * 该模块完全独立，不依赖任何其他业务逻辑。
 */

// 模块级缓存（background service worker 生命周期内有效）
let gateSymbolsCache: Set<string> | null = null;

/**
 * 从 Gate.io 公开 API 拉取 USDT 现货交易对列表
 * 结果缓存在内存中，整个 background 生命周期只请求一次
 */
async function fetchGateSymbols(): Promise<Set<string> | null> {
  if (gateSymbolsCache) return gateSymbolsCache;

  try {
    const res = await fetch('https://api.gateio.ws/api/v4/spot/currency_pairs');
    const json = await res.json();

    if (!Array.isArray(json)) {
      console.warn('[GateFilter] 响应格式异常，无法解析交易对列表');
      return null;
    }

    gateSymbolsCache = new Set(
      (json as Array<{ base: string; quote: string; trade_status: string }>)
        .filter(s => s.quote === 'USDT' && s.trade_status === 'tradable')
        .map(s => s.base)
    );

    console.log(`[GateFilter] 已缓存 ${gateSymbolsCache.size} 个 Gate 支持的代币`);
    return gateSymbolsCache;
  } catch (err) {
    console.warn('[GateFilter] 拉取 Gate 交易对失败:', err);
    return null;
  }
}

/**
 * 过滤出 Gate 支持 / 不支持的代币
 *
 * 安全降级：如果 API 请求失败，返回全部为 supported，不阻断连接
 */
export async function filterForGate(symbols: string[]): Promise<{
  supported: string[];
  unsupported: string[];
}> {
  const gateSet = await fetchGateSymbols();

  if (!gateSet) {
    // API 请求失败，安全降级：不过滤，让连接继续（Gate 报错时再处理）
    console.warn('[GateFilter] 无法获取 Gate 支持列表，跳过过滤');
    return { supported: symbols, unsupported: [] };
  }

  const supported: string[] = [];
  const unsupported: string[] = [];

  for (const symbol of symbols) {
    if (gateSet.has(symbol)) {
      supported.push(symbol);
    } else {
      unsupported.push(symbol);
    }
  }

  if (unsupported.length > 0) {
    console.log(`[GateFilter] 过滤掉 Gate 不支持的代币: [${unsupported.join(', ')}]`);
  }

  return { supported, unsupported };
}

/**
 * 主动清除缓存（用于测试或强制刷新场景）
 */
export function clearGateSymbolsCache(): void {
  gateSymbolsCache = null;
}
