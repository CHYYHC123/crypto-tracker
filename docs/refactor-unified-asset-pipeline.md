# 重构方案：统一 Crypto / Stocks 资产数据管道

> **状态**：待实施  
> **目标**：消除 Crypto 与 Stocks 两套并行逻辑的代码重复，以"数据归一层"为核心，让上层 Store / Handler / 消费端只认一种统一类型。

---

## 一、背景与问题

### 当前架构（双管道）

```
Crypto WS 原始数据                  Stocks WS 原始数据
       ↓                                   ↓
  parseWSMessage                    parseStockMessage
       ↓                                   ↓
    TokenItem                           StockItem        ← 两种类型
       ↓                                   ↓
   tokenStore                          stockStore        ← 两套 Store
       ↓                                   ↓
  wsHandler.ts                      stockWsHandler.ts    ← 两套 Handler
       ↓                                   ↓
 UPDATE_PRICE                    UPDATE_STOCK_PRICE       ← 两种消息类型
       ↓                                   ↓
  content/popup 消费端（需要 if/else 分支区分）
```

### 重复对照表

| 层级 | Crypto | Stocks | 重复内容 |
|------|--------|--------|---------|
| 类型 | `TokenItem` | `StockItem` | 核心字段完全一致 |
| Store | `tokenStore.ts` | `stockStore.ts` | init / apply / throttledPublish 逻辑相同 |
| Handler | `wsHandler.ts` | `stockWsHandler.ts` | setupCallbacks / connect / disconnect / broadcast 结构相同 |
| 消息类型 | `UPDATE_PRICE` | `UPDATE_STOCK_PRICE` | 语义相同 |
| 状态类型 | `DATA_STATUS_CHANGE` | `STOCK_DATA_STATUS_CHANGE` | 语义相同 |
| `index.ts` | if/else 5 处 | if/else 5 处 | onInstalled / idle / alarm 全部双分支 |
| `messageRouter.ts` | isStocks 判断 | isStocks 判断 | handleContentResync / handleRefresh 完全对称 |
| `storageHandler.ts` | isStocks 判断 | isStocks 判断 | handleAssetTypeChange 对称处理 |

### 两种类型的字段差异（仅此而已）

| 字段 | TokenItem | StockItem | 说明 |
|------|-----------|-----------|------|
| `icon` | ✅ | ❌ | Crypto 展示首字母图标，可从 symbol 派生，无需存入 |
| `marketPhase` | ❌ | ✅ | 股票市场阶段（盘前/盘后/收盘），可选字段 |
| `prevClose` | ❌ | ✅ | 昨日收盘价，可选字段 |

---

## 二、目标架构（单管道）

```
Crypto WS 原始数据                  Stocks WS 原始数据
       ↓                                   ↓
  parseCryptoTicker              parseStockTicker
       ↓                                   ↓
              ↘                       ↙
               AssetItem[]（统一类型）         ← 归一在解析层完成
                     ↓
               assetStore（单一 Store）
                     ↓
            UPDATE_ASSET_PRICE（单一消息）
                     ↓
        content / popup 消费端（无 if/else）
```

**核心原则**：两种资产的数据差异，全部在解析层（parser）消化，上层只认 `AssetItem`。

---

## 三、统一类型设计

### 3.1 `AssetItem`（替换 `TokenItem` 与 `StockItem`）

```typescript
// src/types/asset.ts 新增

export interface AssetItem {
  id: string;            // 规范化 ID，格式: `${category}:${symbol.toLowerCase()}`
  symbol: string;        // 展示符号，如 "BTC"、"AAPL"
  category: AssetCategory; // 'crypto' | 'stock'
  price: number;
  change: number;        // 24h 或当日涨跌幅（%）
  lastPrice: number;     // 上一次价格快照，用于闪烁动画

  // 股票独有（可选）
  marketPhase?: string;  // 'C' | 'ON' | 'PRE' | 'POST'
  prevClose?: number;    // 昨日收盘价
}
```

> `icon` 字段从 `TokenItem` 中移除——消费端直接从 `symbol.charAt(0)` 派生，无需存入 Store。

### 3.2 统一消息类型常量

```typescript
// src/types/messages.ts（新建）

export const MSG = {
  UPDATE_ASSET_PRICE: 'UPDATE_ASSET_PRICE',   // 替换 UPDATE_PRICE + UPDATE_STOCK_PRICE
  ASSET_STATUS_CHANGE: 'ASSET_STATUS_CHANGE', // 替换 DATA_STATUS_CHANGE + STOCK_DATA_STATUS_CHANGE
} as const;
```

---

## 四、重构分阶段计划

### Phase 1：类型归一（影响范围：types）

**目标**：定义 `AssetItem`，并让两个 parser 都输出该类型。

**改动文件**：
- `src/types/asset.ts` — 新增 `AssetItem`，废弃 `TokenItem` / `StockItem` 的直接引用
- `src/utils/ws/parseTicker.ts` — `parseWSMessage` 返回类型改为 `AssetItem | null`
- `src/background/stocks/parseStockTicker.ts` — `parseStockMessage` 返回类型改为 `AssetItem[] | null`

**字段映射**：

| AssetItem 字段 | Crypto 来源 | Stocks 来源 |
|---------------|-------------|-------------|
| `id` | `${symbol.toLowerCase()}` | `${symbol.toLowerCase()}` |
| `category` | `'crypto'` (硬编码) | `'stock'` (硬编码) |
| `symbol` | ticker.symbol | r.s |
| `price` | ticker.last | r.p |
| `change` | ticker.changePercent | 计算自 (p-pc)/pc |
| `lastPrice` | 0（初始值，由 store 维护） | 0 |
| `marketPhase` | undefined | r.mp |
| `prevClose` | undefined | r.pc |

---

### Phase 2：Store 归一（影响范围：background）

**目标**：用单一 `assetStore.ts` 替换 `tokenStore.ts` 和 `stockStore.ts`。

**新文件**：`src/background/assetStore.ts`

**导出 API**（与现有保持兼容命名风格）：

```typescript
initAssetStore(items: AssetItem[]): void
applyAssetUpdate(items: AssetItem[]): AssetItem[] | null
getAssetList(): AssetItem[] | null
getAssetLastUpdateTime(): number | null
throttledPublishAssets(list: AssetItem[]): void  // 发送 UPDATE_ASSET_PRICE
```

**核心变化**：
- `_publish` 统一发送 `{ type: 'UPDATE_ASSET_PRICE', data: list }`
- 合并 `applyTickerUpdate`（单条）和 `applyStockUpdate`（多条）为接受 `AssetItem[]` 的统一签名

**废弃**：`tokenStore.ts`、`stockStore.ts`（在完成迁移后删除）

---

### Phase 3：Handler 归一（影响范围：background）

**目标**：用单一 `assetWsHandler.ts` 替换 `wsHandler.ts` 和 `stockWsHandler.ts`。

**新文件**：`src/background/assetWsHandler.ts`

**设计思路**：保留两个 `WsManager` 实例（连接不同交易所），但共享同一套 callback 注册和广播逻辑。

```typescript
// 两个独立 WsManager 实例（连接目标不同）
export const cryptoWsManager = new WsManager();   // 原 wsManager 单例
export const stockWsManager = new WsManager();    // 原 stockWsManager

// 统一注册 callback（接受 manager 和 parser 作为参数）
export function setupAssetWsCallbacks(
  manager: WsManager,
  parser: (data: any) => AssetItem[] | null
): void

// 统一广播状态（发送 ASSET_STATUS_CHANGE）
function broadcastAssetStatus(status: DataStatus): void

// 工厂方法（内部调用 setupAssetWsCallbacks）
export function setupCryptoWsCallbacks(): void
export function setupStockWsCallbacks(): void

// connect / disconnect 保持两套（因为参数不同）
export async function connectCryptoWS(tokenList: string[]): Promise<void>
export async function connectStockWS(symbolList: string[]): Promise<void>
```

**废弃**：`wsHandler.ts`（在完成迁移后删除）、`stockWsHandler.ts`

---

### Phase 4：简化 index.ts（影响范围：background）

**目标**：消除 `onInstalled` / `idle` / `alarm` 中的 `if (isStocks)` 双分支。

**改造方式**：提取 `getActiveWsManager()` 辅助函数，返回当前 asset_type 对应的 manager；提取 `connectActiveWS()` 统一连接入口。

```typescript
// 改造前（每处都有双分支）
if (assetType === 'stocks') {
  connectStockWS(DEFAULT_STOCKS);
} else {
  const tokenList = await getCoins();
  initTokenStore(tokenList);
  connectWebSocket(tokenList);
}

// 改造后
await connectActiveWS(assetType);
```

---

### Phase 5：简化 messageRouter / storageHandler（影响范围：background）

**目标**：`handleContentResync` / `handleRefresh` / `handleAssetTypeChange` 中的 `isStocks` 判断统一走 `connectActiveWS` / `getActiveWsManager`。

**改造前**（messageRouter `handleContentResync`）：

```typescript
// 约 40 行的 isStocks ? ... : ... 对称代码
if (isStocks) { /* stocks 链路 */ }
else { /* crypto 链路 */ }
```

**改造后**：

```typescript
const manager = getActiveWsManager(assetType);
const list = getAssetList();
const lastUpdate = getAssetLastUpdateTime();
// 统一判断，不分 isStocks
```

---

### Phase 6：消费端统一（影响范围：content / popup）

**目标**：content 和 popup 监听 `UPDATE_ASSET_PRICE` 一种消息，类型换为 `AssetItem`。

**改动文件**：
- `src/content/components/contentMain.tsx` — `UPDATE_PRICE` → `UPDATE_ASSET_PRICE`，`TokenItem` → `AssetItem`
- content hooks 中的 `useTokenPrice` / `useStockPrice` — 可合并为 `useAssetPrice`
- `src/hooks/useDataStatus.ts` — `DATA_STATUS_CHANGE` / `STOCK_DATA_STATUS_CHANGE` → `ASSET_STATUS_CHANGE`
- popup 中消费价格的 hooks/组件 — 同步更新类型

> **注意**：`icon` 字段从 `AssetItem` 中移除后，消费端渲染图标时改为 `symbol.charAt(0)` 派生，不影响视觉效果。

---

## 五、迁移顺序与风险控制

```
Phase 1 (类型)
    → Phase 2 (Store)     ← 依赖 Phase 1 完成
        → Phase 3 (Handler)   ← 依赖 Phase 2 完成
            → Phase 4/5 (index / router / storage)  ← 依赖 Phase 3
                → Phase 6 (消费端)  ← 依赖 Phase 1 + 4/5
```

**每个 Phase 的验收标准**：
- Phase 1：两个 parser 输出类型为 `AssetItem`，TS 编译无报错
- Phase 2：`assetStore` 功能覆盖旧两个 store，价格更新正常
- Phase 3：两种资产 WS 连接正常，状态广播统一
- Phase 4/5：`index.ts` 无 `isStocks` if/else，messageRouter 代码行数减少 ~40%
- Phase 6：content 展示 crypto / stocks 价格均正常，无功能回退

---

## 六、重构后文件变化总览

### 新增
| 文件 | 说明 |
|------|------|
| `src/background/assetStore.ts` | 统一 Store |
| `src/background/assetWsHandler.ts` | 统一 Handler |
| `src/types/messages.ts` | 统一消息类型常量 |

### 修改
| 文件 | 改动说明 |
|------|---------|
| `src/types/asset.ts` | 新增 `AssetItem` |
| `src/utils/ws/parseTicker.ts` | 输出 `AssetItem` |
| `src/background/stocks/parseStockTicker.ts` | 输出 `AssetItem[]` |
| `src/background/index.ts` | 消除 if/else 双分支 |
| `src/background/messageRouter.ts` | 统一 resync / refresh 链路 |
| `src/background/storageHandler.ts` | 统一 asset_type 切换逻辑 |
| `src/content/components/contentMain.tsx` | 类型 + 消息类型更新 |
| `src/hooks/useDataStatus.ts` | 消息类型更新 |

### 废弃（Phase 全部完成后删除）
| 文件 | 被替换为 |
|------|---------|
| `src/background/tokenStore.ts` | `assetStore.ts` |
| `src/background/stocks/stockStore.ts` | `assetStore.ts` |
| `src/background/wsHandler.ts` | `assetWsHandler.ts` |
| `src/background/stocks/stockWsHandler.ts` | `assetWsHandler.ts` |
| `src/types/index.ts` 中的 `TokenItem` | `AssetItem` |
| `src/background/stocks/parseStockTicker.ts` 中的 `StockItem` | `AssetItem` |
