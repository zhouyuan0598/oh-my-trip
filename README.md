# oh-my-trip

一个可持续扩展的旅行攻略合集站，用来沉淀个人旅行偏好、目的地攻略页面和未来可复用的生成模板。

## 当前目标

- 把历史项目 `nanjing-trip` 纳入统一合集。
- 后续新增城市时复用同一套视觉和内容结构。
- 兼顾桌面浏览和手机分享。

## 本地运行

```bash
npm install
npm run dev
```

## 实时信息源（可选）

默认使用静态/示例数据，开启实时信息源需要在 `.env.local` 配置：

```bash
VITE_ENABLE_LIVE_SOURCE=true
VITE_AMAP_KEY=你的高德KEY
VITE_QWEATHER_KEY=你的和风天气KEY
VITE_QWEATHER_HOST=https://你的项目专属和风域名(可选，默认devapi.qweather.com)
VITE_ENABLE_LLM_ROUTE=false
VITE_OPENAI_API_KEY=你的OpenAIKey(可选)
VITE_OPENAI_MODEL=gpt-4.1-mini
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
```

说明：
- 未开启或 key 缺失时，会自动降级到静态示例数据，不影响规划主流程。
- 节假日会尝试 `timor` 公共 API，失败同样自动降级。
- LLM 路线增强默认关闭，开启后会在生成候选方案时追加大模型推荐路线（失败自动回退规则方案）。
- 当前为前端直连模式，仅建议本地验证使用；生产环境建议改为后端代理调用。

## 目录

- `index.html`: 合集首页
- `guides/<slug>/index.html`: 各城市入口页
- `guides/<slug>/assets/`: 各城市资源
- `src/data/trips.js`: 旅行人格和目的地数据
- `src/styles/`: 共享样式
- `templates/trip-template.md`: 新目的地编写说明
