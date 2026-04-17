---
name: openspec-apply-change
description: 根据 OpenSpec change 的任务清单推进实现。适合开始编码、继续编码或逐项完成 tasks。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.0"
---

根据 OpenSpec change 的任务清单执行实现。

本项目中的额外规则：
- 过程汇报默认使用中文
- 如果需要更新工件，新增说明默认使用中文
- 先读取 contextFiles，再实现

## 步骤

1. 选择 change
   - 若用户明确指定，则直接使用
   - 否则根据上下文推断
   - 若仍有歧义，运行 `openspec list --json` 让用户选择
   - 始终说明当前使用的 change 名

2. 查看状态
   ```bash
   openspec status --change "<name>" --json
   ```
   读取 schema 和工件状态。

3. 获取 apply 指令
   ```bash
   openspec instructions apply --change "<name>" --json
   ```
   读取 `contextFiles`、进度、任务列表和动态说明。

4. 读取上下文文件
   - 先读 proposal/specs/design/tasks
   - 再开始实现

5. 循环处理待办任务
   - 说明正在处理哪一项
   - 做最小且聚焦的代码改动
   - 完成后立刻把 `- [ ]` 改为 `- [x]`
   - 若遇到需求不清、设计冲突或阻塞，暂停并说明

6. 结束时汇报进度
   - 本次完成了哪些任务
   - 当前总进度
   - 若全部完成，提示可归档

## Guardrails

- 不要跳过 contextFiles
- 任务有歧义时先停下来确认
- 如果实现中发现设计不成立，优先建议补工件
- 每次只做与当前任务直接相关的改动
