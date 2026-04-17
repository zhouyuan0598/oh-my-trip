---
name: openspec-propose
description: 用一步完成 OpenSpec change 提案与工件生成。适合用户已经说明要做什么，希望直接得到 proposal、design、specs、tasks。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.0"
---

用 OpenSpec 创建一个新的 change，并按依赖顺序生成实现前所需工件。

在本项目中遵守以下额外规则：
- 与用户的说明默认使用中文
- 生成的 proposal、design、specs、tasks 内容默认使用中文
- capability 目录名、change 名仍使用 kebab-case 英文标识，便于 CLI 与归档兼容

会生成的核心工件：
- `proposal.md`：为什么做、改什么
- `design.md`：准备怎么做
- `tasks.md`：实现任务拆解

准备开始实现时，使用 `/opsx:apply`。

---

**输入**：用户应提供一个 change 名，或描述要构建/修复的内容。

## 步骤

1. 如果用户没有给出足够清晰的目标，先追问要做什么。
   使用开放式提问，不要在没理解目标前继续。
   根据描述生成 kebab-case change 名，例如“个人旅游助手 MVP”可转成 `build-personal-travel-assistant-mvp`。

2. 创建 change 目录
   ```bash
   openspec new change "<name>"
   ```

3. 获取工件依赖顺序
   ```bash
   openspec status --change "<name>" --json
   ```
   读取：
   - `applyRequires`
   - `artifacts`

4. 按依赖顺序生成工件，直到达到 apply-ready
   - 对每个 `ready` 的工件执行：
     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```
   - 从指令中读取 `template`、`instruction`、`outputPath`、`dependencies`
   - 先读已完成依赖文件，再写当前工件
   - 严格按模板结构写，但内容使用中文
   - `context`、`rules` 只作为约束，不要抄进最终工件
   - 每完成一个工件，简短汇报一次进度
   - 每次写完后重新运行 `openspec status --change "<name>" --json`

5. 当 `applyRequires` 中所有工件都完成后，输出最终状态
   ```bash
   openspec status --change "<name>"
   ```

## 输出要求

完成后总结：
- change 名称与目录
- 已创建的工件及其用途
- 当前是否已经可进入实现
- 提示用户可运行 `/opsx:apply`

## 工件编写规则

- 严格遵循 `openspec instructions` 返回的结构与约束
- 所有正文内容默认写中文
- specs 中的 requirement/scenario 名称可以写中文
- capability 名和文件夹名保持 kebab-case，避免破坏 OpenSpec 约定
- 写新工件前必须读取依赖工件

## Guardrails

- 必须生成实现所需的全部工件
- 若上下文关键缺失，可以提问；否则优先做合理决策保持推进
- 如果同名 change 已存在，先确认是续写还是新建
- 写完每个工件后确认文件已存在，再进入下一步
