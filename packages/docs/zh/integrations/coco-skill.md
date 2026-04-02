# Coco 接入

Inspecto 当前通过 `AGENTS.md` 兼容模板为 Coco 提供 onboarding 接入。

## 安装

使用统一安装脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- coco
```

这会安装 `AGENTS.md`。

仓库资产：

```text
assistant-integrations/coco/AGENTS.md
```

更新后，重新打开一个新的 Coco 会话。

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Set up Inspecto in this project and show me the plan before changing files
```

## 这个集成会做什么

兼容模板会让 Coco 优先使用官方的 Inspecto CLI 协议：

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

如果当前环境中的 CLI 还没有发布这些结构化命令，模板会要求 Coco 解释这个限制，并回退到 `inspecto init`。

## 说明

- 目前这是兼容模板，不是已确认的原生 Coco skill 包。
- onboarding 默认会写 `.inspecto/settings.local.json` 和 `.inspecto/prompts.local.json`。
- 如果你需要了解响应字段语义，请查看 [Onboarding Contract](../../integrations/onboarding-contract.md)。
