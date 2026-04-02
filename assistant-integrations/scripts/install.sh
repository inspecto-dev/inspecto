#!/usr/bin/env bash

set -euo pipefail

REPO_RAW_BASE="https://raw.githubusercontent.com/inspecto-dev/inspecto/main"

usage() {
  cat <<'EOF'
Usage:
  install.sh <assistant> [variant] [--force]

Assistants:
  claude-code [project|user]
  copilot [instructions|agents]
  cursor [rules|agents]
  gemini
  trae
  coco

Examples:
  install.sh claude-code project
  install.sh copilot
  install.sh cursor rules
  install.sh gemini

Notes:
  - Existing files are not overwritten unless --force is provided.
  - Run this from the repository root where you want the integration files created.
EOF
}

assistant="${1:-}"
variant="${2:-}"
force="false"

for arg in "$@"; do
  if [[ "$arg" == "--force" ]]; then
    force="true"
  fi
done

if [[ -z "$assistant" || "$assistant" == "--help" || "$assistant" == "-h" ]]; then
  usage
  exit 1
fi

download_file() {
  local source="$1"
  local target="$2"

  mkdir -p "$(dirname "$target")"

  if [[ -e "$target" && "$force" != "true" ]]; then
    echo "Refusing to overwrite existing file: $target"
    echo "Re-run with --force if you want to replace it."
    exit 1
  fi

  curl -fsSL "$source" -o "$target"
}

install_claude_code() {
  local scope="${1:-project}"
  local base_dir=""

  case "$scope" in
    project)
      base_dir=".claude/skills/inspecto-onboarding-claude-code"
      ;;
    user)
      base_dir="${HOME}/.claude/skills/inspecto-onboarding-claude-code"
      ;;
    *)
      echo "Unknown Claude Code variant: $scope"
      usage
      exit 1
      ;;
  esac

  download_file "${REPO_RAW_BASE}/skills/inspecto-onboarding-claude-code/SKILL.md" "${base_dir}/SKILL.md"
  download_file "${REPO_RAW_BASE}/skills/inspecto-onboarding-claude-code/agents/openai.yaml" "${base_dir}/agents/openai.yaml"
  download_file "${REPO_RAW_BASE}/skills/inspecto-onboarding-claude-code/scripts/run-inspecto.sh" "${base_dir}/scripts/run-inspecto.sh"
  chmod +x "${base_dir}/scripts/run-inspecto.sh"

  echo "Installed Claude Code skill to ${base_dir}"
  echo "Restart Claude Code to load the new skill."
}

install_copilot() {
  local mode="${1:-instructions}"

  case "$mode" in
    instructions)
      download_file "${REPO_RAW_BASE}/assistant-integrations/copilot/.github/copilot-instructions.md" ".github/copilot-instructions.md"
      echo "Installed Copilot instructions to .github/copilot-instructions.md"
      ;;
    agents)
      download_file "${REPO_RAW_BASE}/assistant-integrations/copilot/AGENTS.md" "AGENTS.md"
      echo "Installed Copilot compatibility instructions to AGENTS.md"
      ;;
    *)
      echo "Unknown Copilot variant: $mode"
      usage
      exit 1
      ;;
  esac

  echo "Open a new Copilot chat or agent session."
}

install_cursor() {
  local mode="${1:-rules}"

  case "$mode" in
    rules)
      download_file "${REPO_RAW_BASE}/assistant-integrations/cursor/.cursor/rules/inspecto-onboarding.mdc" ".cursor/rules/inspecto-onboarding.mdc"
      echo "Installed Cursor rule to .cursor/rules/inspecto-onboarding.mdc"
      ;;
    agents)
      download_file "${REPO_RAW_BASE}/assistant-integrations/cursor/AGENTS.md" "AGENTS.md"
      echo "Installed Cursor compatibility instructions to AGENTS.md"
      ;;
    *)
      echo "Unknown Cursor variant: $mode"
      usage
      exit 1
      ;;
  esac

  echo "Open a new Cursor chat."
}

install_gemini() {
  download_file "${REPO_RAW_BASE}/assistant-integrations/gemini/GEMINI.md" "GEMINI.md"
  echo "Installed Gemini context to GEMINI.md"
  echo "Start a new Gemini CLI session."
}

install_trae() {
  download_file "${REPO_RAW_BASE}/assistant-integrations/trae/AGENTS.md" "AGENTS.md"
  echo "Installed Trae compatibility instructions to AGENTS.md"
  echo "Open a new Trae chat."
}

install_coco() {
  download_file "${REPO_RAW_BASE}/assistant-integrations/coco/AGENTS.md" "AGENTS.md"
  echo "Installed Coco compatibility instructions to AGENTS.md"
  echo "Start a new Coco session."
}

case "$assistant" in
  claude-code)
    install_claude_code "$variant"
    ;;
  copilot)
    install_copilot "$variant"
    ;;
  cursor)
    install_cursor "$variant"
    ;;
  gemini)
    install_gemini
    ;;
  trae)
    install_trae
    ;;
  coco)
    install_coco
    ;;
  *)
    echo "Unknown assistant: $assistant"
    usage
    exit 1
    ;;
esac
