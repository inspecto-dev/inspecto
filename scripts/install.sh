#!/usr/bin/env bash

set -euo pipefail

REPO_RAW_BASE="https://raw.githubusercontent.com/inspecto-dev/inspecto/main"

usage() {
  cat <<'EOF'
Usage:
  install.sh <assistant> [variant] [--host-ide <ide>] [--force]

Assistants:
  codex [project|user]
  claude-code [project|user]
  copilot [skills|instructions|agents]
  cursor [skills|rules|agents]
  gemini
  trae
  coco

Examples:
  install.sh codex
  install.sh codex project --host-ide cursor
  install.sh claude-code project
  install.sh copilot skills
  install.sh cursor skills
  install.sh gemini

Notes:
  - Existing files are not overwritten unless --force is provided.
  - Run this from the repository root where you want the integration files created.
EOF
}

assistant=""
variant=""
host_ide=""
force="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host-ide)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --host-ide"
        usage
        exit 1
      fi
      host_ide="$2"
      shift 2
      ;;
    --force)
      force="true"
      shift
      ;;
    codex|claude-code|copilot|cursor|gemini|trae|coco)
      if [[ -n "$assistant" ]]; then
        echo "Unexpected extra assistant argument: $1"
        usage
        exit 1
      fi
      assistant="$1"
      shift
      if [[ $# -gt 0 && "$1" != "--force" ]]; then
        variant="$1"
        shift
      fi
      ;;
    --help|-h)
      usage
      exit 1
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
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

install_claude_code_raw() {
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

install_codex_raw() {
  local scope="${1:-project}"
  local base_dir=""

  case "$scope" in
    project)
      base_dir=".agents/skills/inspecto-onboarding-codex"
      ;;
    user)
      base_dir="${HOME}/.agents/skills/inspecto-onboarding-codex"
      ;;
    *)
      echo "Unknown Codex variant: $scope"
      usage
      exit 1
      ;;
  esac

  download_file "${REPO_RAW_BASE}/skills/inspecto-onboarding-codex/SKILL.md" "${base_dir}/SKILL.md"
  download_file "${REPO_RAW_BASE}/skills/inspecto-onboarding-codex/agents/openai.yaml" "${base_dir}/agents/openai.yaml"
  download_file "${REPO_RAW_BASE}/skills/inspecto-onboarding-codex/scripts/run-inspecto.sh" "${base_dir}/scripts/run-inspecto.sh"
  chmod +x "${base_dir}/scripts/run-inspecto.sh"

  echo "Installed Codex skill to ${base_dir}"
  echo "Restart Codex or start a new Codex session to load the skill."
}

install_copilot_raw() {
  local mode="${1:-skills}"

  case "$mode" in
    skills|instructions|agents)
      download_file "${REPO_RAW_BASE}/skills/inspecto-onboarding-copilot/SKILL.md" ".github/skills/inspecto-onboarding/SKILL.md"
      echo "Installed Copilot skill to .github/skills/inspecto-onboarding/SKILL.md"
      ;;
    *)
      echo "Unknown Copilot variant: $mode"
      usage
      exit 1
      ;;
  esac

  echo "Open a new Copilot chat or agent session."
}

install_cursor_raw() {
  local mode="${1:-skills}"

  case "$mode" in
    skills|rules|agents)
      download_file "${REPO_RAW_BASE}/skills/inspecto-onboarding-cursor/SKILL.md" ".cursor/skills/inspecto-onboarding/SKILL.md"
      echo "Installed Cursor skill to .cursor/skills/inspecto-onboarding/SKILL.md"
      ;;
    *)
      echo "Unknown Cursor variant: $mode"
      usage
      exit 1
      ;;
  esac

  echo "Open a new Cursor chat."
}

install_gemini_raw() {
  download_file "${REPO_RAW_BASE}/skills/inspecto-onboarding-gemini/SKILL.md" ".gemini/skills/inspecto-onboarding/SKILL.md"
  echo "Installed Gemini skill to .gemini/skills/inspecto-onboarding/SKILL.md"
  echo "Start a new Gemini CLI session."
}

install_trae_raw() {
  download_file "${REPO_RAW_BASE}/skills/inspecto-onboarding-trae/SKILL.md" ".trae/skills/inspecto-onboarding/SKILL.md"
  echo "Installed Trae skill to .trae/skills/inspecto-onboarding/SKILL.md"
  echo "Open a new Trae chat."
}

install_coco_raw() {
  download_file "${REPO_RAW_BASE}/skills/inspecto-onboarding-trae/SKILL.md" ".traecli/skills/inspecto-onboarding/SKILL.md"
  echo "Installed Coco skill to .traecli/skills/inspecto-onboarding/SKILL.md"
  echo "Start a new Coco session."
}

run_install() {
  local cli_args=(integrations install "$assistant")

  if [[ "$force" == "true" ]]; then
    cli_args+=(--force)
  fi

  if [[ -n "$host_ide" ]]; then
    cli_args+=(--host-ide "$host_ide")
  fi

  case "$assistant" in
    codex|claude-code)
      cli_args+=(--scope "${variant:-project}")
      ;;
    copilot)
      cli_args+=(--mode "${variant:-skills}")
      ;;
    cursor)
      cli_args+=(--mode "${variant:-skills}")
      ;;
    gemini|trae|coco)
      if [[ -n "$variant" && "$variant" != "--force" ]]; then
        echo "Unexpected variant for $assistant: $variant"
        usage
        exit 1
      fi
      ;;
    *)
      echo "Unknown assistant: $assistant"
      usage
      exit 1
      ;;
  esac

  if [[ -f "./packages/cli/bin/inspecto.js" ]] && node ./packages/cli/bin/inspecto.js "${cli_args[@]}"; then
    return
  fi

  if [[ -x "./node_modules/.bin/inspecto" ]] && ./node_modules/.bin/inspecto "${cli_args[@]}"; then
    return
  fi

  if command -v npx >/dev/null 2>&1 && npx @inspecto-dev/cli "${cli_args[@]}"; then
    return
  fi

  echo "Falling back to raw asset installation..."

  case "$assistant" in
    codex)
      install_codex_raw "${variant:-project}"
      ;;
    claude-code)
      install_claude_code_raw "${variant:-project}"
      ;;
    copilot)
      install_copilot_raw "${variant:-skills}"
      ;;
    cursor)
      install_cursor_raw "${variant:-skills}"
      ;;
    gemini)
      install_gemini_raw
      ;;
    trae)
      install_trae_raw
      ;;
    coco)
      install_coco_raw
      ;;
  esac
}

run_install
