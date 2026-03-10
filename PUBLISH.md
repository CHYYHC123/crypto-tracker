# Crypto Tracker 浏览器插件上线流程

本文档说明如何将本插件打包并提交到 Chrome 应用商店（Chrome Web Store）。

---

## 环境要求

- **Node.js**：建议 **20.19+** 或 **22.12+**（当前项目 Vite 构建需要）。若使用 nvm，可执行 `nvm use 22` 或按项目 `scripts/build.sh` 中指定版本切换。
- **npm / pnpm**：能正常安装依赖并执行脚本即可。

---

## 一、上线前自检

### 1. 本地测试

在打包前，先在浏览器中加载未打包版本，确认功能正常：

1. 执行 `npm run build_no_getToken` 或 `npm run build`（需能访问 OKX 接口时用 build）
2. 打开 Chrome：`chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择项目下的 **`dist`** 目录
5. 逐项测试：弹窗、浮窗、通知、数据源切换等

### 2. 确认 manifest 信息

- **name**、**version**、**description** 会在商店展示，上传后不能改 manifest 里的这些字段，只能通过「商店信息」改展示文案。
- 版本号建议从较小值开始（如 1.0.0），后续每次更新必须大于当前已上架版本。
- 描述不超过 132 个字符（当前已在 manifest 中配置）。

### 3. 图标要求（应用商店）

- 扩展图标：必须在 ZIP 内提供 **128×128 像素** PNG，已在 `manifest.config.ts` 中配置为 `public/logo.png`。
- 若当前 `public/logo.png` 不是 128×128，请导出一张 128×128 的 PNG 替换或单独提供，否则可能审核不通过。

---

## 二、打包发布用 ZIP

### 方式一：推荐（不拉取 OKX 币种列表，适合上线/CI）

```bash
npm run pack
```

或分步执行：

```bash
npm run build_no_getToken
```

- 会执行 `tsc` 和 `vite build`，并自动打 ZIP。
- 生成的 ZIP 路径：**`release/crypto-tracker-<version>.zip`**（版本号来自 `package.json` 的 `version`）。
- 无需代理或访问 OKX 接口，使用仓库内已有的 `src/utils/tokens.ts`。

### 方式二：需要更新币种列表时

在可访问 OKX 的环境（或配置好代理）下：

```bash
npm run build
```

- 会先运行 `scripts/getToken.js` 更新 `src/utils/tokens.ts`，再构建并打 ZIP。
- ZIP 同样在 `release/crypto-tracker-<version>.zip`。

### 上传用 ZIP 要求

- 使用上述 **`release/crypto-tracker-<version>.zip`** 即可。
- 该 ZIP 根目录包含 `manifest.json` 及所有扩展资源，符合 Chrome 要求。

---

## 三、Chrome 开发者账号与费用

1. 打开 [Chrome Web Store 开发者仪表盘](https://chrome.google.com/webstore/devconsole)。
2. 使用 Google 账号登录。
3. **一次性注册费**：首次发布扩展需支付约 **5 美元** 开发者注册费（以官方当前说明为准）。

---

## 四、在 Chrome Web Store 提交

### 1. 上传 ZIP

1. 在开发者仪表盘点击「**新项目**」。
2. 上传 **`release/crypto-tracker-<version>.zip`**。
3. 若提示 manifest 或权限问题，按提示修改后重新 `npm run pack` 再上传。

### 2. 填写商店信息（必填）

以下为可直接复制到表单的参考内容。

**软件包中的标题**（若与 manifest 一致可不动）  
- 已填：`Crypto Tracker - Real-time Price Widget`

**软件包中的摘要**（同上）  
- 已填：`Real-time crypto price tracker with floating widget.`

**说明\***（必填，最多 16,000 字，着重用途与安装理由）

- **中文说明（推荐先填中文，再按需添加语言）：**

```
Crypto Tracker 是一款在浏览器中使用的加密货币实时行情扩展。在任意网页上显示可拖拽的浮窗，无需打开交易所网站即可查看 BTC、ETH、SOL 等 300+ 币种的实时价格与涨跌幅。

主要功能：
• 浮窗展示：在任意页面显示可拖拽、可展开/收起的行情浮窗，支持自定义币种与排序。
• 实时数据：通过 WebSocket 连接交易所（当前支持 OKX），自动更新价格与 UTC+8 日涨跌幅。
• 价格提醒：为每个币种设置上限/下限提醒，触发时浏览器通知提醒。
• 弹窗管理：点击扩展图标可搜索添加币种、切换数据源、刷新数据。

适合需要随时关注行情、又不想反复打开交易所页面的用户。数据仅在本地与所选交易所之间传输，不在第三方服务器存储您的个人数据。
```

- **English description（若添加英文语言可复制）：**

```
Crypto Tracker is a Chrome extension for real-time cryptocurrency prices. It shows a draggable floating widget on any webpage so you can track BTC, ETH, SOL and 300+ coins without opening exchange sites.

Features:
• Floating widget: Draggable, expandable list with custom coins and order.
• Live data: WebSocket connection to OKX (and more), with auto-updating prices and daily change (UTC+8).
• Price alerts: Set upper/lower limits per coin and get browser notifications when triggered.
• Popup: Add coins, switch data source, and refresh from the extension icon.

Best for users who want to keep an eye on the market while browsing. Data is only between your browser and the exchange; we do not store your personal data on our servers.
```

**类别\***  
- 建议选择：**生产力** 或 **工具**（若列表中有「金融」且更符合你的定位也可选）。

**语言\***  
- 至少选一项：**中文（简体）**；若面向海外用户可再选 **English**，并在对应语言下粘贴上面的英文说明。

**商店图标 \***（128×128 像素）  
- 上传项目中的 **`public/logo.png`**。若该图不是 128×128，请先用图片工具裁成 128×128 再上传。

### 3. 商店所需图片

| 类型 | 规格 | 说明 |
|------|------|------|
| 扩展图标 | 128×128 PNG | 已在扩展 ZIP 中，无需在仪表盘再传一次 |
| 小促销图（必填） | **440×280** 像素 | 在「商店信息」里上传，用于列表/推广 |
| 截图（至少 1 张） | **1280×800** 或 **640×400** | 展示插件实际界面与功能 |

可选用项目里 `public/demo.png`、`public/demo1.png` 裁剪或拼成上述尺寸；若尺寸不符，需用设计工具调整后再上传。

### 4. 隐私与权限说明

- 在「隐私权」或「单条权限说明」中，对 manifest 里声明的权限做简要说明，例如：
  - **storage**：保存你的设置与自选币种
  - **activeTab / scripting**：在当前页面注入浮窗
  - **notifications**：价格提醒
  - **host_permissions（okx.com、ipapi.co）**：获取行情与定位（若使用）
- 若扩展会收集或上传用户数据，需提供隐私政策链接；若仅本地使用、不收集数据，可在说明中写明「不在服务器存储个人数据」。

#### 隐私权表单填写（单一用途与权限理由）

以下内容可直接复制到「隐私权」页面的对应输入框（每项最多 1,000 字）。

**单一用途说明\***

```
本扩展的单一用途为：在用户浏览的任意网页上展示一个可拖拽的加密货币实时行情浮窗，方便用户在不打开交易所网站的情况下查看自选币种的当前价格与涨跌幅；并支持设置价格上下限提醒，在触发时通过浏览器通知提醒用户。所有用户数据（自选币种、提醒设置、数据源选择）仅保存在浏览器本地，不会上传到任何第三方服务器。
```

**需请求 storage 的理由\***

```
用于在用户设备本地保存以下设置，以便在关闭浏览器或重新打开页面后保持使用习惯：用户添加的自选币种列表、各币种的价格提醒上下限、所选数据源（如 OKX）。上述数据仅写入 chrome.storage.local，不会发送到扩展开发者或任何其他服务器。移除该权限将无法持久化用户配置。
```

**需请求 activeTab 的理由\***

```
当用户点击扩展图标或使用扩展功能时，需要访问当前激活的浏览器标签页，以便在该页面上注入并显示行情浮窗，以及将用户的自选列表、数据源与提醒设置同步到浮窗。仅在用户与扩展发生交互时访问当前标签页，用于实现浮窗的展示与更新。移除该权限将无法在用户正在浏览的页面上显示浮窗。
```

**需请求 scripting 的理由\***

```
用于在用户当前浏览的页面中注入并执行扩展自带的浮窗脚本，以便在页面上绘制可拖拽的行情浮窗并接收来自扩展的实时价格与提醒数据。注入的代码仅来自扩展安装包内的 content script，不加载或执行任何来自网络的脚本。移除该权限将无法在任意网页上显示浮窗。
```

**需请求 idle 的理由\***

```
用于检测用户是否处于离开或锁屏状态。当用户长时间未操作或锁屏时，扩展会暂停 WebSocket 与交易所的连接以节省带宽与电量；当用户返回时自动恢复连接并刷新行情。移除该权限将无法实现按需连接，可能导致后台持续连接交易所。
```

**需请求 notifications 的理由\***

```
当用户为某币种设置的价格上限或下限被触发时，扩展需要调用系统通知（Chrome notifications API）在桌面显示提醒，以便用户及时得知价格变动。仅用于用户主动设置的价格提醒，不会推送营销或无关信息。移除该权限将无法实现价格提醒功能。
```

**需请求主机权限的理由\***

```
用于实现扩展核心功能：1) 连接 OKX 的 WebSocket 与 REST 接口（wss://wspri.okx.com、https://www.okx.com）以获取用户自选币种的实时行情数据；2) 请求 ipapi.co 的公开接口以判断用户网络环境（如是否在中国大陆），从而选择本地缓存或直连 API 进行币种校验，优化在不同地区的使用体验。上述请求仅获取公开的行情与网络位置信息，不向这些域名上传用户身份或隐私数据，也不收集超出实现功能所需的数据。
```

**您正在使用远程代码吗？**

- 建议选择：**不，我并未使用远程代码**。  
  本扩展的所有运行逻辑与脚本均来自打包在扩展内的代码；与 OKX、ipapi.co 的通信仅用于获取行情数据与网络地区信息（JSON/WebSocket 数据），不从任何远程地址加载或执行 JavaScript 或其他可执行代码。  
- 若你当前误选了「是的，我在使用远程代码」，请改选「不，我并未使用远程代码」；若改选后仍出现「理由」输入框，可留空或填写：  
  「本扩展不加载、不执行任何来自远程的代码，仅通过 API 获取数据。」

#### 数据使用（目前或未来您打算向用户收集哪些用户数据？）

本扩展**不向服务器上传或收集**用户身份、行为或网页内容数据。仅在本机使用 `chrome.storage.local` 保存用户的自选币种、价格提醒与数据源选择，用于扩展功能，且不发送给开发者或第三方。

- **用户活动**（网络监控、点击、鼠标位置、滚屏、击键等）：**不勾选**。本扩展不监控、不记录用户在网页上的点击、滚动或输入行为。
- **网站内容**（文字、图片、声音、视频、超链接等）：**不勾选**。本扩展不读取、不提取用户所浏览网页的内容；行情数据来自交易所公开 API，非从页面抓取。

若表单中还有「不收集用户数据」或「仅本地存储」等选项，可勾选以更准确说明情况。

#### 确认与隐私权政策

**我确认下列披露信息均属实：**

- 必须**勾选全部 3 项**才能符合开发者计划政策：
  1. 我不会出于已获批准的用途之外的用途向第三方出售或传输用户数据。
  2. 我不会为实现与我的产品的单一用途无关的目的而使用或转移用户数据。
  3. 我不会为确定信用度或实现贷款而使用或转移用户数据。

本扩展不收集、不上传用户数据，上述承诺与当前行为一致，可放心全选。

**隐私权政策网址\***

即使不向服务器收集用户数据，商店仍可能要求填写隐私政策网址。请将下面内容发布到一个**可公开访问的网页**（如 GitHub Pages、项目 README 所在页、或你的个人网站），然后把该页的 URL 填到「隐私权政策网址」：

```
Crypto Tracker 扩展隐私说明

本扩展（Crypto Tracker）不会向开发者或任何第三方服务器收集、上传或传输您的个人数据或身份信息。

• 您添加的自选币种、价格提醒设置、数据源选择等，仅保存在您设备上的浏览器本地存储（chrome.storage.local）中，用于扩展功能展示与提醒。
• 扩展会向 OKX、ipapi.co 等公开接口请求行情与网络地区信息，此类请求不携带可识别您身份的信息。
• 我们不会出售、出租或与第三方共享您的数据，也不会将数据用于信用评估或贷款等用途。

如有更新，我们会在此页或扩展更新说明中注明。使用扩展即表示您知悉上述内容。
```

- 若你的项目已放在 GitHub，可新建仓库页面 `docs/privacy.md` 或 `PRIVACY.md`，把上述内容贴进去，然后使用链接：  
  `https://github.com/<你的用户名>/<仓库名>/blob/main/PRIVACY.md`  
  或为仓库启用 GitHub Pages 后使用：  
  `https://<你的用户名>.github.io/<仓库名>/privacy`  
  将对应网址填入「隐私权政策网址」即可。

### 5. 提交审核

- 填写完必填项并上传图片后，选择「**提交以供审核**」。
- 审核通常需数小时到数天，状态会在开发者仪表盘中更新。
- 若被拒，根据邮件或仪表盘中的原因修改后，更新版本号（改 `package.json` 的 `version`），重新 `npm run pack`，再上传新 ZIP 并重新提交。

---

## 五、后续更新版本

1. 在 **`package.json`** 中把 **`version`** 改为更大版本号（如 `1.0.0` → `1.0.1`）。
2. 重新打包：  
   `npm run pack`
3. 在开发者仪表盘中找到该扩展，点击「**打包扩展程序**」或「**上传新版本**」，上传新的 **`release/crypto-tracker-<新版本>.zip`**。
4. 填写本次更新的说明（可选但建议写），再次提交审核。

---

## 六、常用命令速查

| 命令 | 说明 |
|------|------|
| `npm run build_no_getToken` | 构建 + 打 ZIP（不拉取 OKX 币种，适合发布） |
| `npm run pack` | 同上，并提示 ZIP 输出路径 |
| `npm run build` | 拉取最新币种列表后构建 + 打 ZIP（需网络/代理） |
| `npm run dev` | 本地开发 |

---

## 七、参考链接

- [准备扩展（官方）](https://developer.chrome.com/docs/webstore/prepare)
- [发布扩展](https://developer.chrome.com/docs/webstore/publish)
- [商店图片要求](https://developer.chrome.com/docs/webstore/images)
- [开发者仪表盘](https://chrome.google.com/webstore/devconsole)
