# Onboarding 集成

Inspecto 为常见的 AI 编码助手提供了专门的 onboarding 集成。有些平台支持原生 skill，有些平台则应该使用原生的指令文件或规则文件。它们都包装了同一套 CLI 协议：

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

它们的目标是让用户可以直接在助手里说“帮我把 Inspecto 接进当前项目”，先看计划，再确认执行，最后由 CLI 完成真实的文件修改。

从安装体验上，优先推荐统一安装脚本；只有在需要手动兜底时，才建议直接拉单个资产或复制本地文件。

## 推荐安装方式

使用统一安装脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- <assistant>
```

示例：

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- claude-code project
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- copilot
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- cursor rules
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- gemini
```

所有 onboarding 集成默认都会写本地配置：

- `.inspecto/settings.local.json`
- `.inspecto/prompts.local.json`

## 可用集成

| 助手                                  | 类型       | 仓库路径                                  | 安装目标                                               | 说明                                      |
| :------------------------------------ | :--------- | :---------------------------------------- | :----------------------------------------------------- | :---------------------------------------- |
| [Codex](./codex-skill.md)             | 原生 skill | `skills/inspecto-onboarding-codex`        | Codex skills 目录                                      | 推荐通过 `$skill-installer` 安装。        |
| [Claude Code](./claude-code-skill.md) | 原生 skill | `skills/inspecto-onboarding-claude-code`  | `.claude/skills/` 或 `~/.claude/skills/`               | 使用 `claude-code` 参数运行统一安装脚本。 |
| [Copilot](./copilot-skill.md)         | 指令模板   | `assistant-integrations/copilot`          | `.github/copilot-instructions.md` 或 `AGENTS.md`       | 使用 `copilot` 参数运行统一安装脚本。     |
| [Cursor](./cursor-skill.md)           | 规则模板   | `assistant-integrations/cursor`           | `.cursor/rules/inspecto-onboarding.mdc` 或 `AGENTS.md` | 使用 `cursor` 参数运行统一安装脚本。      |
| [Gemini](./gemini-skill.md)           | 上下文模板 | `assistant-integrations/gemini/GEMINI.md` | `GEMINI.md`                                            | 使用 `gemini` 参数运行统一安装脚本。      |
| [Trae](./trae-skill.md)               | 兼容模板   | `assistant-integrations/trae/AGENTS.md`   | `AGENTS.md`                                            | 使用 `trae` 参数运行统一安装脚本。        |
| [Coco](./coco-skill.md)               | 兼容模板   | `assistant-integrations/coco/AGENTS.md`   | `AGENTS.md`                                            | 使用 `coco` 参数运行统一安装脚本。        |

## 统一流程

无论使用哪个助手，流程都一致：

1. 探测当前项目。
2. 向用户解释 onboarding 计划。
3. 在修改文件前请求确认。
4. 通过 CLI 执行接入。
5. 如果失败，再调用 `doctor --json` 做诊断。

## 说明

- v1 只覆盖 onboarding，不覆盖安装后的日常 Inspecto 使用流程。
- 原生 skill 会优先使用本地 Inspecto workspace CLI；没有时再回退到 `@inspecto-dev/cli@latest`。
- 指令模板会要求 assistant 优先走结构化 onboarding；如果当前 CLI 版本还没有这些命令，再回退到 `init`。
- 如果你需要了解 JSON 字段语义和自动化约束，请查看英文版 [Onboarding Contract](../../integrations/onboarding-contract.md)。
