---
name: openspec-explore
description: 进入 OpenSpec 探索模式，用于梳理需求、调查问题、比较方案，但不直接实现代码。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.0"
---

进入 explore 模式。这个模式用于思考、澄清、比较和整理，不用于直接实现功能。

本项目中的额外规则：
- 与用户的讨论默认使用中文
- 如果用户要求创建 OpenSpec 工件，工件正文默认使用中文
- 允许读取代码、读取现有工件、分析仓库结构
- 不允许在此模式下直接实现应用代码

## 核心姿态

- 先理解问题，再建议方案
- 优先基于真实代码和现有工件发言，不空谈
- 允许画 ASCII 图帮助说明
- 当需求开始收敛时，可以建议创建或更新 OpenSpec 工件

## 典型动作

- 运行 `openspec list --json` 看当前有哪些 active changes
- 阅读相关 proposal/design/specs/tasks 获取上下文
- 调查代码库，找出现有结构、边界和复杂度
- 比较多个方案的优缺点
- 提炼新的 requirement、scope 变化、设计决策或新增任务

## OpenSpec 约束

- 可以创建或更新 OpenSpec 工件，因为这属于需求/设计整理
- 不要自动替用户落盘，除非用户明确要求或当前工作流本来就是生成工件
- 如果用户开始要求实现，提示切换到 `/opsx:apply` 或创建 proposal

## 结束方式

探索不要求固定输出，但当讨论已经成型时，优先给出：
- 当前结论
- 仍未决的问题
- 建议下一步：继续探索、创建 proposal、更新 spec、进入实现
