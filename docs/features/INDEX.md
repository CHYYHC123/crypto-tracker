# 功能文档索引

> 每个功能对应一份文档，记录入口链路、文件职责、数据流时序图。
> 新功能开发前或完成后，使用 `feature-flow-doc` skill 生成/更新对应文档。

---

## 功能列表

| 功能 | 文档 | 状态 | 涉及层 | 最后更新 |
|------|------|------|--------|---------|
| 全局预警 | [global-alerts.md](global-alerts.md) | 已完成 | Popup / Background / Content | 2026-04-28 |
| 单币价格预警 | [price-alerts.md](price-alerts.md) | 待补充 | Popup / Content | - |
| 数据源切换 | [data-source.md](data-source.md) | 待补充 | Popup / Background | - |
| 代币导入导出 | [import-export.md](import-export.md) | 待补充 | Popup | - |
| Token 搜索 | [token-search.md](token-search.md) | 待补充 | Popup / Background | - |

---

## 架构分层速查

```
Popup (src/popup/)
  ├── pages/          页面组件（路由级别）
  ├── components/     UI 组件
  ├── router/         路由配置
  └── utils/          Popup 专用工具函数

Background (src/background/)
  ├── index.ts        消息监听、WS 连接、storage 事件分发
  ├── coinsManager.ts 币种列表读写
  ├── globalAlertsManager.ts  全局预警逻辑（settings + trigger）
  └── badge.ts        图标 Badge 状态

Content (src/content/)
  ├── main.tsx        注入入口
  ├── components/     页面内 UI 组件
  └── hooks/          数据订阅 / 预警检测 hooks

Shared
  ├── src/types/      TypeScript 类型定义
  ├── src/config/     交易所配置
  └── src/utils/      通用工具（wsManager、parseTicker 等）
```

## 消息类型总览

| 消息类型 | 发送方 | 接收方 | 说明 |
|---------|--------|--------|------|
| `UPDATE_PRICE` | Background | Content | 推送最新价格列表 |
| `DATA_STATUS_CHANGE` | Background | Content | WS 连接状态变化 |
| `PRICE_ALERTS_UPDATED` | Background | Content | 单币预警配置变更 |
| `REFRESH` | Popup | Background | 手动触发重连 |
| `GET_LATEST_PRICES` | Popup | Background | 获取当前价格快照 |
| `CONTENT_RESYNC` | Content | Background | 页面可见时请求数据同步 |
| `GET_COINS` | Popup/Content | Background | 获取币种列表 |
| `SET_COINS` | Popup/Content | Background | 更新币种列表 |
| `REORDER_TOKENS` | Popup | Background | 重排序（不触发 WS 重连）|
| `SHOW_NOTIFICATION` | Content | Background | 触发系统通知 |
| `ALERT_TRIGGERED` | Content | Background | 设置 Badge 为红色 |
| `ALERT_CLEAR` | Content | Background | 清除 Badge |
