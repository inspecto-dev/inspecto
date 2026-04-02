# Codex Skill

Inspecto 在这个仓库中提供了官方的 Codex onboarding skill，目录位于 `skills/inspecto-onboarding-codex`。

如果你希望由 Codex 完成完整接入流程，而不是手动运行 `inspecto init`，就使用它。

## 安装

让 Codex 从当前仓库安装该 skill：

```text
Use $skill-installer to install https://github.com/inspecto-dev/inspecto/tree/main/skills/inspecto-onboarding-codex
```

你也可以直接运行安装脚本：

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo inspecto-dev/inspecto \
  --path skills/inspecto-onboarding-codex
```

安装完成后，重启 Codex 以加载新 skill。

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Use $inspecto-onboarding-codex to set up Inspecto in this project
```

## Skill 会做什么

这个 skill 包装了 Inspecto 官方 CLI 协议：

1. `detect --json`
2. `plan --json`
3. `apply --json`
4. `doctor --json`

助手应该先解释接入计划，再执行安装，并在失败时使用 `doctor --json` 做恢复诊断。

## 说明

- 首次运行时，如果本地没有 Inspecto CLI，runner 会回退到 `@inspecto-dev/cli@latest`，因此可能需要网络访问。
- 如果你当前环境中的已发布 CLI 版本还没有 `detect`、`plan` 或 `apply`，请优先使用本地 Inspecto workspace CLI，或者等待下一次 CLI 发布。
- 在 monorepo 中，如果根目录下存在多个候选 app，skill 可能会要求你切换到目标 app 目录后再继续。
- 默认会写入 `.inspecto/settings.local.json` 和 `.inspecto/prompts.local.json`。
- JSON 字段语义请参考英文版 [Onboarding Contract](../../integrations/onboarding-contract.md)。
