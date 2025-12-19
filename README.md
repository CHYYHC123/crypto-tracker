# Crypto Tracker

<p align="center">
  <img src="public/logo.png" alt="Crypto Tracker Logo" width="80" />
</p>

<p align="center">
  <strong>一款实时加密货币价格追踪 Chrome 扩展</strong>
</p>

<p align="center">
  实时价格 · 悬浮组件 · 自定义追踪
</p>

---

## 📖 项目简介

**Crypto Tracker** 是一款基于 Chrome Extension Manifest V3 开发的浏览器扩展，提供实时加密货币价格追踪功能。通过 OKX WebSocket API 获取实时行情数据，支持在任意网页上显示悬浮价格组件，让你随时掌握市场动态。

## ✨ 核心功能

### 🎯 实时价格追踪

- 通过 OKX WebSocket 连接获取实时价格数据
- 支持 300+ 种加密货币（BTC、ETH、SOL、BNB 等）
- 显示当日涨跌幅（基于 UTC+8 开盘价计算）
- 价格自动更新，无需手动刷新

### 🔲 悬浮组件 (Floating Widget)

- 在任意网页上显示可拖拽的悬浮窗口
- 支持展开/收起模式
- 收起时显示第一个币种的实时价格
- 展开时显示完整的追踪列表
- 自动吸附到屏幕边缘

### 📌 Popup 弹窗

- 点击扩展图标打开管理面板
- 搜索并添加新的追踪币种
- 移除不需要的币种
- 手动刷新数据
- 10 秒自动刷新倒计时

### 🛡️ 智能网络检测

- 自动检测用户网络环境（中国大陆/海外）
- 大陆网络使用本地缓存验证币种
- 海外网络直接调用 OKX API 验证

### 🔄 稳定连接机制

- WebSocket 断线自动重连
- 用户闲置状态检测（锁屏自动断开，解锁自动重连）
- 数据停滞检测与自动刷新

## 🛠️ 技术栈

| 技术                  | 用途            |
| --------------------- | --------------- |
| **React 19**          | UI 框架         |
| **TypeScript**        | 类型安全        |
| **Vite 7**            | 构建工具        |
| **Tailwind CSS 4**    | 样式框架        |
| **Framer Motion**     | 动画效果        |
| **SWR**               | 数据请求与缓存  |
| **CRXJS Vite Plugin** | Chrome 扩展开发 |
| **OKX WebSocket API** | 实时行情数据    |

## 📁 项目结构

```
crypto-tracker/
├── src/
│   ├── background/          # Service Worker (后台脚本)
│   │   └── index.ts         # WebSocket 连接、消息处理
│   ├── popup/               # 扩展弹窗 UI
│   │   ├── index.html       # 弹窗入口
│   │   ├── main.tsx         # React 入口
│   │   └── PopupContent.tsx # 弹窗主组件
│   ├── content/             # 内容脚本
│   │   ├── main.tsx         # 内容脚本入口
│   │   └── views/
│   │       └── App.tsx      # 悬浮组件
│   ├── components/          # 公共组件
│   │   ├── common/          # 通用 UI 组件
│   │   └── CustomToaster/   # Toast 通知组件
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useInactivityRefresh.ts  # 数据停滞检测
│   │   ├── useComposition.ts        # 输入法组合
│   │   └── usePersistFn.ts          # 持久化函数
│   ├── utils/               # 工具函数
│   │   ├── index.ts         # 通用工具
│   │   └── tokens.ts        # 支持的币种列表（自动生成）
│   ├── types/               # TypeScript 类型定义
│   └── assets/              # 静态资源
├── scripts/
│   ├── build.sh             # 构建脚本
│   └── getToken.js          # 获取 OKX 支持的币种
├── public/                  # 公共资源
├── dist/                    # 构建输出
├── release/                 # 发布包
├── manifest.config.ts       # Chrome 扩展配置
├── vite.config.ts           # Vite 配置
└── package.json
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9
- Chrome 浏览器

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 加载扩展

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目的 `dist` 目录

### 生产构建

```bash
npm run build
```

构建完成后，`dist` 目录包含可发布的扩展文件。

### 打包发布

```bash
npm run build_sh
```

将在 `release` 目录生成 `.zip` 发布包。

## 📝 使用说明

### 添加追踪币种

1. 点击浏览器工具栏的扩展图标
2. 在搜索框输入币种符号（如 `BTC`、`ETH`）
3. 点击「Add」按钮或按回车键
4. 币种验证成功后自动添加到列表

### 移除追踪币种

- 在 Popup 列表中，点击币种右侧的「Remove」按钮
- 注意：至少需要保留一个追踪币种

### 悬浮组件操作

- **拖拽**：按住组件头部可自由拖动
- **展开/收起**：点击右上角的 +/- 按钮
- **刷新**：展开后点击底部「Refresh」按钮

## ⚙️ 配置说明

### manifest.config.ts

```typescript
{
  manifest_version: 3,
  name: 'Crypto Tracker',
  permissions: ['storage', 'alarms', 'activeTab', 'scripting', 'idle'],
  host_permissions: ['https://www.okx.com/*', 'https://ipapi.co/*']
}
```

### 权限说明

| 权限        | 用途                   |
| ----------- | ---------------------- |
| `storage`   | 存储用户追踪的币种列表 |
| `alarms`    | 定时任务（预留）       |
| `activeTab` | 向当前标签页发送消息   |
| `scripting` | 注入内容脚本           |
| `idle`      | 检测用户闲置状态       |

## 🔧 开发脚本

### 更新支持的币种列表

```bash
node scripts/getToken.js
```

该脚本会从 OKX API 获取所有支持 USDT 交易对的币种，并更新 `src/utils/tokens.ts` 文件。

> ⚠️ 注意：脚本需要配置代理才能访问 OKX API

## 📊 数据流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        Background Script                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Storage   │───▶│  WebSocket  │───▶│  Price Processing   │  │
│  │  (coins)    │    │  (OKX API)  │    │  (updateTokenList)  │  │
│  └─────────────┘    └─────────────┘    └──────────┬──────────┘  │
└───────────────────────────────────────────────────┼─────────────┘
                                                    │
                          chrome.tabs.sendMessage   │
                                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Content Script                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              FloatingCryptoWidget (App.tsx)              │    │
│  │  - 监听 UPDATE_PRICE 消息                                │    │
│  │  - 渲染实时价格                                          │    │
│  │  - 可拖拽悬浮组件                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          Popup Script                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                PopupContent.tsx                          │    │
│  │  - 发送 GET_LATEST_PRICES 获取数据                       │    │
│  │  - 添加/移除币种                                         │    │
│  │  - 手动刷新                                              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 界面预览

### Popup 弹窗

- 深色主题设计
- 显示币种图标、符号、价格、涨跌幅
- 支持搜索添加和移除币种

### 悬浮组件

- 圆角卡片设计
- 毛玻璃效果背景
- 流畅的展开/收起动画
- 自动吸附屏幕边缘

## 📋 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解版本更新历史。

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目仅供学习交流使用。

## 🙏 致谢

- [OKX](https://www.okx.com/) - 提供实时行情 WebSocket API
- [CRXJS](https://crxjs.dev/) - Chrome 扩展 Vite 插件
- [Tailwind CSS](https://tailwindcss.com/) - 原子化 CSS 框架
- [Framer Motion](https://www.framer.com/motion/) - React 动画库

---

<p align="center">
  Made with ❤️ for Crypto Enthusiasts
</p>
