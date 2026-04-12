#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${INSPECTO_CLI_BIN:-}" && -f "${INSPECTO_CLI_BIN}" ]]; then
  exec node "${INSPECTO_CLI_BIN}" "$@"
fi

if [[ -n "${INSPECTO_DEV_REPO:-}" && -f "${INSPECTO_DEV_REPO}/packages/cli/dist/bin.js" ]]; then
  exec node "${INSPECTO_DEV_REPO}/packages/cli/dist/bin.js" "$@"
fi

if [[ -f ".inspecto/dev.json" ]]; then
  dev_cli_bin="$(sed -n 's/.*"cliBin"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' .inspecto/dev.json | head -n 1)"
  if [[ -n "${dev_cli_bin:-}" && -f "${dev_cli_bin}" ]]; then
    exec node "${dev_cli_bin}" "$@"
  fi

  dev_repo="$(sed -n 's/.*"devRepo"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' .inspecto/dev.json | head -n 1)"
  if [[ -n "${dev_repo:-}" && -f "${dev_repo}/packages/cli/dist/bin.js" ]]; then
    exec node "${dev_repo}/packages/cli/dist/bin.js" "$@"
  fi
fi

if [[ -f "./packages/cli/bin/inspecto.js" && -d "./packages/cli/dist" ]]; then
  exec node ./packages/cli/bin/inspecto.js "$@"
fi

if command -v inspecto >/dev/null 2>&1; then
  exec inspecto "$@"
fi

if command -v pnpm >/dev/null 2>&1; then
  pnpm_global_bin="$(pnpm bin -g 2>/dev/null || true)"
  if [[ -n "${pnpm_global_bin}" && -x "${pnpm_global_bin}/inspecto" ]]; then
    exec "${pnpm_global_bin}/inspecto" "$@"
  fi
fi

if command -v npm >/dev/null 2>&1; then
  npm_global_prefix="$(npm prefix -g 2>/dev/null || true)"
  if [[ -n "${npm_global_prefix}" && -x "${npm_global_prefix}/bin/inspecto" ]]; then
    exec "${npm_global_prefix}/bin/inspecto" "$@"
  fi
fi

if [[ -x "./node_modules/.bin/inspecto" ]]; then
  exec ./node_modules/.bin/inspecto "$@"
fi

if [[ -f "pnpm-lock.yaml" ]]; then
  exec pnpm dlx @inspecto-dev/cli@latest "$@"
fi

if [[ -f "yarn.lock" ]]; then
  exec yarn dlx @inspecto-dev/cli@latest "$@"
fi

if [[ -f "bun.lock" || -f "bun.lockb" ]]; then
  exec bunx @inspecto-dev/cli@latest "$@"
fi

exec npx @inspecto-dev/cli@latest "$@"
