# oh-my-trip

移动端优先的个人旅行规划 MVP。  
核心目标是把“做攻略”拆成可决策的流程：输入条件 -> 生成候选方案 -> 选择交通与路线 -> 发布分享页。

## 项目定位

- 这是一个**决策支持型**旅行产品，不是交易平台。
- 重点能力是：多方案对比、交通方式选择、天气/路线等实时信息辅助、发布分享页。
- 已支持首页合集、`/planner` 规划页、`/guides/<slug>` 分享页三段闭环。

## MVP 已实现能力

- 规划流程：必填信息 -> 偏好微调 -> 候选方案 -> 发布确认 -> 发布成功。
- 候选方案：支持 A/B/C 对比，展示推荐理由、交通方案、按天游玩建议。
- 交通决策：支持“方案默认推荐 + 手动覆盖交通”，发布按最终选择落地。
- 实时数据（可选）：高德路线/POI、和风天气、节假日查询，失败自动降级。
- AI 增强（可选）：大模型生成路线与景点建议，失败自动回退规则方案。
- 自动化测试：Playwright 覆盖关键主流程（生成、调整、发布、回到首页）。

## 非目标（当前版本）

- 不包含订票、支付、自动代下单。
- 不包含复杂海外行程和供应链比价系统。

## 快速开始

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run build
npm run preview
npm run test:e2e
npm run test:e2e:headed
```

## 环境变量配置（`.env.local`）

默认使用静态/示例数据。开启实时与 AI 能力可配置：

```bash
# 实时信息源
VITE_ENABLE_LIVE_SOURCE=true
VITE_AMAP_KEY=你的高德KEY
VITE_QWEATHER_KEY=你的和风天气KEY
VITE_QWEATHER_HOST=https://你的和风专属域名   # 可选，默认 https://devapi.qweather.com

# AI 路线增强
VITE_ENABLE_LLM_ROUTE=false
VITE_OPENAI_API_KEY=你的模型服务Key
VITE_OPENAI_MODEL=gpt-4.1-mini
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
```

说明：

- 未开启或 key 缺失时，会自动降级，不影响主流程可用性。
- 节假日使用 `timor` 公共 API，异常时同样降级。
- 当前为前端直连配置，生产环境建议改后端代理，避免密钥暴露。

## 页面与目录结构

- `index.html`：首页（已发布旅程合集）
- `planner/index.html`：规划页（MVP 主流程）
- `guides/<slug>/index.html`：分享页
- `src/scripts/`：页面交互逻辑（home / planner / guide）
- `src/data/`：数据模型与信息源聚合（含 AI、实时源）
- `src/styles/`：全局与页面样式
- `tests/`：Playwright E2E 测试
- `openspec/`：需求工件与变更归档

## 流程示意图（文本版）

```text
首页（index）
  -> 点击「开始规划」
  -> /planner
      Step 1 必填信息（目的地/人数/预算/日期）
      Step 2 偏好微调（交通/节奏/兴趣/回避项）
      Step 3 生成候选方案（A/B/C）
        -> 选择方案 + 选择交通（可手动覆盖）
      Step 4 发布确认
      Step 5 发布成功
        -> 查看分享页 / 返回首页
  -> /guides/<slug>（最终分享页）
  -> 首页列表同步展示新发布条目
```

## 部署说明（静态托管）

本项目是 Vite 多页面应用，可部署到任意静态托管平台。构建产物目录为 `dist/`。

### 1) 通用构建

```bash
npm install
npm run build
```

### 2) Vercel

- Framework Preset：`Vite`
- Build Command：`npm run build`
- Output Directory：`dist`
- Node.js：建议 `18+`
- 若需实时/AI能力，在 Vercel 项目设置中添加同名环境变量（见上文 `.env.local`）

### 3) Netlify

- Build command：`npm run build`
- Publish directory：`dist`
- 可在 `Site settings -> Environment variables` 配置运行所需变量

### 4) GitHub Pages（推荐 Actions）

1. 在仓库开启 Pages（Source 选择 GitHub Actions）。
2. 添加工作流（示例）：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

说明：如果后续配置了自定义 `base` 路径，需要同步调整 Vite 配置和部署路径。

## 说明

本仓库当前处于 MVP 第一版阶段，优先保证移动端可用性、流程连贯性和可验证性。后续迭代在此基础上扩展更完整的推荐与数据能力。
