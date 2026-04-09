# Onboarding Contract (Legacy)

This page is kept for backward compatibility.

Inspecto's recommended machine-readable onboarding contract is now single-entry:

1. `inspecto onboard --json`
2. 如果 `status` 是 `needs_target_selection`，先说明这一步是在选择要接入 Inspecto 的本地开发构建目标，然后使用返回结果中的某个 candidate id 带上 `--target <candidateId>` 重新运行。CLI 也兼容接受返回里的 `configPath` 作为兜底值。
3. if `status` is `needs_confirmation`, rerun with `--yes`
4. use `inspecto doctor --json` only when onboarding returns `error` or unresolved diagnostics

## Current Status Model

`inspecto onboard --json` returns assistant-oriented statuses:

- `success`
- `partial_success`
- `needs_target_selection`
- `needs_confirmation`
- `error`

The payload also includes:

- `target`: selected candidate information and selection reason
- `summary`: user-facing change/risk summary
- `confirmation`: whether a lightweight user confirmation is required
- `ideExtension`: required install state and official install references
- `verification`: suggested dev-server validation command when available
- `result`: mutations and installed dependencies
- `diagnostics`: warnings/errors/next steps

## Legacy Commands

`detect --json`, `plan --json`, and `apply --json` are still available as low-level debugging commands, but they are no longer the recommended integration protocol for assistant onboarding.
