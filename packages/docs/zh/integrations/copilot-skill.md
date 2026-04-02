# Copilot 接入

Inspecto 不提供原生的 Copilot skill 目录。对 GitHub Copilot 来说，正确的安装面应该是仓库级指令文件。

## 推荐安装方式

使用统一安装脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- copilot
```

这会安装 `.github/copilot-instructions.md`。

## 可选安装方式

如果你的 Copilot 工作流统一使用 `AGENTS.md`，可以改用：

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- copilot agents
```

仓库资产：

```text
assistant-integrations/copilot/.github/copilot-instructions.md
assistant-integrations/copilot/AGENTS.md
```

更新后，重新打开一个新的 Copilot Chat 或 Agent 会话。

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Set up Inspecto in this project and show me the plan before changing files
```

## 这个集成会做什么

模板会让 Copilot 优先使用官方的 Inspecto CLI 协议：

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

如果当前环境中的 CLI 还没有发布这些结构化命令，模板会要求 Copilot 解释这个限制，并回退到 `inspecto init`。

## 说明

- onboarding 默认会写 `.inspecto/settings.local.json` 和 `.inspecto/prompts.local.json`。
- 如果是在 monorepo 根目录执行，onboarding 流程可能会提示你切换到单个 app 目录后重试。
- 如果你需要了解响应字段语义，请查看 [Onboarding Contract](../../integrations/onboarding-contract.md)。
