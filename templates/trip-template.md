# New Trip Template

新增一个目的地时，优先沿用 `src/data/trips.js` 的结构，不要重新发明页面。

## 目标

- 保持合集站视觉统一，但每个城市有自己的气质。
- 输出必须手机可读、可直接分享。
- 页面信息密度要高，但阅读感受仍然像旅行特刊，不像表格。

## 建议流程

1. 在 `src/data/trips.js` 里新增一个 trip 对象。
2. 在 `guides/<slug>/assets/` 放封面和景点图片。
3. 复制 `guides/nanjing/index.html` 到新的 `guides/<slug>/index.html`。
4. 调整 trip 的这些字段：
   - `city`
   - `title`
   - `subtitle`
   - `dateRange`
   - `route`
   - `stay`
   - `companion`
   - `duration`
   - `theme`
   - `coverImage`
   - `cardSummary`
   - `highlights`
   - `overview`
   - `days`
   - `travelNotes`

## 内容提示词

给 AI 新生成攻略时，至少补这些约束：

- 这次是和谁去，几个人，关系是什么。
- 出发地、天数、预算、季节。
- 更想要历史、人文、自然、城市感、夜景、美食里哪些。
- 节奏偏松弛还是高密度。
- 是否重视拍照、夜游、酒店氛围、交通省心。
- 哪些体验明确不要，比如特种兵赶路、过于商业化、排队过长。

## spot 条目建议

每个 `spot` 最少写：

- `title`
- `image`
- `description`
- `meta`
- `bullets`

其中 `description` 写整体气质，`bullets` 写具体为什么值得去。
