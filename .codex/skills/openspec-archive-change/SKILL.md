---
name: openspec-archive-change
description: 将已完成的 OpenSpec change 归档。适合在实现结束后做收尾与归档。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.0"
---

归档一个已完成的 OpenSpec change。

本项目中的额外规则：
- 所有说明与确认默认使用中文
- 若需要补充归档说明，正文默认使用中文

## 步骤

1. 选择 change
   - 如果用户没指定，运行 `openspec list --json`
   - 只展示 active changes
   - 不要猜测，存在歧义时必须让用户确认

2. 检查工件是否完成
   ```bash
   openspec status --change "<name>" --json
   ```
   若仍有未完成工件，先告知风险，再确认是否继续。

3. 检查任务是否完成
   - 读取 `tasks.md`
   - 统计 `- [ ]` 与 `- [x]`
   - 若仍有未完成任务，先告知风险，再确认是否继续

4. 如有 delta specs，先评估是否同步主 specs
   - 比较 `openspec/changes/<name>/specs/` 与 `openspec/specs/`
   - 说明会同步什么
   - 让用户决定“先同步再归档”还是“直接归档”

5. 执行归档
   - 创建 `openspec/changes/archive/`
   - 按 `YYYY-MM-DD-<change-name>` 归档

6. 输出归档总结
   - change 名称
   - schema
   - 归档位置
   - 是否同步了 specs
   - 是否带着警告归档

## Guardrails

- 未指定 change 时不要自动猜
- 有风险时只提示和确认，不要强拦截
- 保留 `.openspec.yaml`
- 若目标归档目录已存在，直接报错，不要覆盖
