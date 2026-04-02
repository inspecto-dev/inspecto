# Cursor 接入

Inspecto 不提供原生的 Cursor skill 目录。对 Cursor 来说，正确的安装面应该是 rules 文件。

## 推荐安装方式

使用统一安装脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- cursor rules
```

这会安装 `.cursor/rules/inspecto-onboarding.mdc`。

## 可选安装方式

如果你的团队统一使用 `AGENTS.md`，也可以改用：

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- cursor agents
```

仓库资产：

```text
assistant-integrations/cursor/.cursor/rules/inspecto-onboarding.mdc
assistant-integrations/cursor/AGENTS.md
```

更新后，重新打开一个新的 Cursor Chat。

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Set up Inspecto in this project and show me the plan before changing files
```

## 这个集成会做什么

规则会让 Cursor 优先使用官方的 Inspecto CLI 协议：

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

如果当前环境中的 CLI 还没有发布这些结构化命令，规则会要求 Cursor 解释这个限制，并回退到 `inspecto init`。

## 说明

- onboarding 默认会写 `.inspecto/settings.local.json` 和 `.inspecto/prompts.local.json`。
- 如果是在 monorepo 根目录执行，onboarding 流程可能会提示你切换到单个 app 目录后重试。
- 如果你需要了解响应字段语义，请查看 [Onboarding Contract](../../integrations/onboarding-contract.md)。
