/**
 * Chrome storage.local 统一访问层
 *
 * 规则：整个项目只有这里直接调用 chrome.storage.local，
 * 其他模块通过本文件导出的具名函数读写 storage。
 *
 * 例外：coinsManager / globalAlertsManager 有自己的内存缓存层，
 * 其内部可继续直接访问 storage，无需经过此文件。
 */

import type { PriceAlert, GlobalAlerts, GlobalAlertsTrigger, AssetTypes } from '@/types/index';
import {
  defaultDataSource,
  ExchangeListMap,
  type ExchangeType,
  type SelectableExchangeType,
} from '@/config/exchangeConfig';

// ─── Schema：所有 key 与其值类型的唯一映射 ──────────────────────────────────

interface LocalSchema {
  data_source: ExchangeType;
  asset_type: AssetTypes;
  price_alerts: PriceAlert[];
  coins: string[];
  token_string: string;
  ga_client_id: string;
  global_alerts: GlobalAlerts;
  global_alerts_trigger: GlobalAlertsTrigger;
}

// ─── 泛型底层（不对外导出）──────────────────────────────────────────────────

async function getLocal<K extends keyof LocalSchema>(key: K): Promise<LocalSchema[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as LocalSchema[K] | undefined;
}

async function setLocal<K extends keyof LocalSchema>(key: K, value: LocalSchema[K]): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// ─── data_source ────────────────────────────────────────────────────────────

/**
 * 读取数据源，含 disabled 校验：
 * - 所选交易所已禁用 → 重置为默认值并返回（修复无效状态）
 * 默认值的写入由 background/initDefaultStorage 在安装时统一处理。
 */
export async function getDataSource(): Promise<ExchangeType> {
  const exchange = (await getLocal('data_source')) ?? defaultDataSource;

  if (ExchangeListMap[exchange as SelectableExchangeType]?.disabled) {
    await setLocal('data_source', defaultDataSource);
    return defaultDataSource;
  }

  return exchange;
}

export const setDataSource = (v: ExchangeType): Promise<void> => setLocal('data_source', v);

// ─── asset_type ─────────────────────────────────────────────────────────────

/** 读取资产类型，未设置时默认返回 'crypto' */
export async function getAssetType(): Promise<AssetTypes> {
  return (await getLocal('asset_type')) ?? 'crypto';
}

export const setAssetType = (v: AssetTypes): Promise<void> => setLocal('asset_type', v);

// ─── price_alerts ────────────────────────────────────────────────────────────

export const getPriceAlerts = (): Promise<PriceAlert[] | undefined> => getLocal('price_alerts');

export const setPriceAlerts = (v: PriceAlert[]): Promise<void> => setLocal('price_alerts', v);

// ─── coins ───────────────────────────────────────────────────────────────────

export const getCoinsFromStorage = (): Promise<string[] | undefined> => getLocal('coins');

export const setCoinsToStorage = (v: string[]): Promise<void> => setLocal('coins', v);

// ─── token_string ────────────────────────────────────────────────────────────

export const getTokenString = (): Promise<string | undefined> => getLocal('token_string');

export const setTokenString = (v: string): Promise<void> => setLocal('token_string', v);

// ─── ga_client_id ────────────────────────────────────────────────────────────

/** 读取 GA client id，不存在时自动生成并持久化 */
export async function getGaClientId(): Promise<string> {
  const existing = await getLocal('ga_client_id');
  if (existing) return existing;
  const newId = crypto.randomUUID();
  await setLocal('ga_client_id', newId);
  return newId;
}

export const setGaClientId = (v: string): Promise<void> => setLocal('ga_client_id', v);

// ─── global_alerts ───────────────────────────────────────────────────────────

export const getGlobalAlerts = (): Promise<GlobalAlerts | undefined> => getLocal('global_alerts');

export const setGlobalAlerts = (v: GlobalAlerts): Promise<void> => setLocal('global_alerts', v);

// ─── global_alerts_trigger ───────────────────────────────────────────────────

export const getGlobalAlertsTrigger = (): Promise<GlobalAlertsTrigger | undefined> => getLocal('global_alerts_trigger');

export const setGlobalAlertsTrigger = (v: GlobalAlertsTrigger): Promise<void> => setLocal('global_alerts_trigger', v);
