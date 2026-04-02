# Claude Code Skill

Inspecto 在这个仓库中提供了官方的 Claude Code onboarding skill，目录位于 `skills/inspecto-onboarding-claude-code`。

如果你希望由 Claude Code 完成完整接入流程，而不是手动运行 `inspecto init`，就使用它。

## 安装

Claude Code 支持原生 skills。更推荐使用统一安装脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- claude-code project
```

如果要装到用户目录：

```bash
curl -fsSL https://raw.githubusercontent.com/inspecto-dev/inspecto/main/assistant-integrations/scripts/install.sh | bash -s -- claude-code user
```

如果你正在本地开发或调试 Inspecto 仓库，仍然可以手动复制本地目录：

```bash
mkdir -p .claude/skills
cp -R path/to/inspecto/skills/inspecto-onboarding-claude-code .claude/skills/
```

仓库路径：

```text
skills/inspecto-onboarding-claude-code
```

安装完成后，重启 Claude Code。

然后直接说：

推荐直接使用下面这句英文提示词，以减少不同 assistant 对中文措辞的理解偏差：

```text
Use inspecto-onboarding-claude-code to set up Inspecto in this project
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
