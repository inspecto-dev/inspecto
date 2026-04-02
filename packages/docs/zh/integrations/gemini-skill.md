# Gemini 接入

Inspecto 不提供原生的 Gemini skill 目录。对 Gemini CLI 来说，正确的安装面应该是 `GEMINI.md`。

## 安装

使用统一安装脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- gemini
```

这会安装 `GEMINI.md`。

仓库资产：

```text
assistant-integrations/gemini/GEMINI.md
```

更新后，重新启动一个新的 Gemini CLI 会话。

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Set up Inspecto in this project and show me the plan before changing files
```

## 这个集成会做什么

模板会让 Gemini CLI 优先使用官方的 Inspecto CLI 协议：

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

如果当前环境中的 CLI 还没有发布这些结构化命令，模板会要求 Gemini 解释这个限制，并回退到 `inspecto init`。

## 说明

- onboarding 默认会写 `.inspecto/settings.local.json` 和 `.inspecto/prompts.local.json`。
- 如果是在 monorepo 根目录执行，onboarding 流程可能会提示你切换到单个 app 目录后重试。
- 如果你需要了解响应字段语义，请查看 [Onboarding Contract](../../integrations/onboarding-contract.md)。
