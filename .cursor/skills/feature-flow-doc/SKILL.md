---
name: feature-flow-doc
description: 为功能需求生成和维护结构化文档（入口链路、文件职责、数据流时序图）。适用于：开发新功能前做设计审计、开发完成后做实现审计、查看某功能的完整数据流。触发词：文档化功能、生成流程文档、分析功能数据流、审计功能逻辑、feature doc、flow doc。
---

# Feature Flow Doc

## 项目架构约束（必读）

本项目为 Chrome 扩展，三端隔离：

| 层 | 目录 | 职责 | 通信方式 |
|----|------|------|---------|
| Popup | `src/popup/` | UI 交互、路由、配置读写 | `chrome.storage` 读写 |
| Background | `src/background/` | 持久逻辑、WS 连接、消息分发 | `chrome.runtime.onMessage` |
| Content | `src/content/` | 页面注入、价格展示、预警触发 | `chrome.runtime.sendMessage` |
| Storage | `chrome.storage.local` | 跨端共享状态 | 唯一数据持久化入口 |

**架构禁止规则：**
- Popup 不做定时轮询，不直接调用 fetch
- Content 不直接写 Storage（统一经由 hook 或 sendMessage）
- 业务逻辑不写在 React 组件内，抽到 `hooks/` 或 `background/` 中

---

## 工作流

### 模式 A：设计审计（写代码前）

触发：用户描述一个新功能需求，未开始编码。

步骤：
1. 根据需求推导涉及的层和文件（对照架构约束）
2. 生成 `docs/features/<feature-name>.md`（状态标记为"设计中"）
3. 在文档底部附 Mermaid 时序图（设计版，标注 `[设计版]`）
4. 更新 `docs/features/INDEX.md`
5. 在回复中说明：此文档可作为后续编码 Prompt 的约束附件

### 模式 B：实现审计（写代码后）

触发：用户提到某功能已完成，或要求扫描现有代码生成文档。

步骤：
1. grep/glob 扫描真实文件，定位所有涉及该功能的代码
2. 阅读关键文件，提取：入口、数据流向、storage key、消息类型、文件职责
3. 生成/覆盖 `docs/features/<feature-name>.md`（状态标记为"已完成"）
4. 在文档底部附 Mermaid 时序图（实现版，标注 `[实现版]`）
5. 如果发现逻辑放错层（如定时器在 React 组件内），在文档"已知问题"区标注
6. 更新 `docs/features/INDEX.md`

---

## 文档输出规范

- 文件路径：`docs/features/<kebab-case-name>.md`
- 模板参考：[TEMPLATE.md](TEMPLATE.md)
- 时序图：Mermaid `sequenceDiagram`，参与者按 用户→Popup→Storage→Background→Content 顺序排列
- 文件路径引用格式：`src/background/globalAlertsManager.ts`（相对于项目根）

---

## 命名约定

| 功能 | 文件名 |
|------|--------|
| 全局预警 | `global-alerts.md` |
| 单币预警 | `price-alerts.md` |
| 数据源切换 | `data-source.md` |
| 代币导入导出 | `import-export.md` |
| Token 搜索 | `token-search.md` |
