#!/usr/bin/env bash
set -euo pipefail

if [[ -f "./packages/cli/bin/inspecto.js" && -d "./packages/cli/dist" ]]; then
  exec node ./packages/cli/bin/inspecto.js "$@"
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
