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

- **简短描述**：一句话介绍（会出现在列表页）。
- **详细描述**：功能、使用场景、注意事项等（可写多段）。
- **类别**：例如「生产力工具」或「金融」等最贴近的类别。
- **语言**：至少选择一种（如「中文（简体）」和「English」）。

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
