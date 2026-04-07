# @inspecto-dev/cli

The official command-line interface for Inspecto. This tool automates the process of detecting, planning, applying, and maintaining the Inspecto setup within your project.

## Onboarding Flow

For most users, the preferred setup path is assistant-first onboarding via the integrations documented in:
`packages/docs/integrations/onboarding-skills.md`

Run the install command for your assistant from the target project root:

```bash
npx @inspecto-dev/cli integrations install codex --host-ide vscode
npx @inspecto-dev/cli integrations install claude-code --scope project --host-ide vscode
npx @inspecto-dev/cli integrations install copilot --host-ide vscode
npx @inspecto-dev/cli integrations install cursor --host-ide cursor
npx @inspecto-dev/cli integrations install gemini --host-ide vscode
npx @inspecto-dev/cli integrations install trae --host-ide trae-cn
npx @inspecto-dev/cli integrations install coco --host-ide trae-cn
```

Supported assistants currently include `codex`, `claude-code`, `copilot`, `cursor`, `gemini`, `trae`, and `coco`.

`--host-ide` values: `vscode`, `cursor`, `trae`, `trae-cn`.

Inspect available integration targets with:

```bash
npx @inspecto-dev/cli integrations list
npx @inspecto-dev/cli integrations path <assistant>
```

Use `inspecto init` when you want a guided setup directly in the terminal, or when the assistant path is unavailable.

If you are building your own agent/runtime integration, the machine-readable flow is:

1. `inspecto detect --json`
2. `inspecto plan --json`
3. `inspecto apply --json`
4. `inspecto doctor --json`

See the public onboarding contract for response shapes and field semantics:
`packages/docs/integrations/onboarding-contract.md`

## Installation

You can use the CLI without installing it globally by using `npx`:

```bash
npx @inspecto-dev/cli <command>
```

Alternatively, you can install it as a dev dependency in your project:

```bash
npm install -D @inspecto-dev/cli
```

## Commands

### `inspecto detect`

Detects whether the current project can be onboarded automatically.

**Features:**

- Detects the package manager, build tool/framework, IDE, and available AI tools.
- Produces structured output for agent-driven setup flows.

### `inspecto plan`

Previews the onboarding plan for the current project.

**Features:**

- Summarizes the proposed setup strategy and actions.
- Produces structured output that agents can inspect before applying changes.

### `inspecto apply [--json]`

Applies the onboarding plan to the current project. Use `--json` when the command is driven by an agent/runtime integration.

**Features:**

- Installs the required `@inspecto-dev/plugin` dependencies.
- Injects the plugin into supported build configurations.
- Installs or configures the selected IDE extension when needed.
- Writes `.inspecto/settings.local.json` and updates `.gitignore` when appropriate.

### `inspecto integrations`

Manages assistant integration assets for the current project.

**Subcommands:**

- `inspecto integrations list` prints the supported assistant targets and their preferred install surfaces.
- `inspecto integrations path <assistant>` prints the concrete files that a selected variant will create.
- `inspecto integrations install <assistant>` installs the integration assets for the selected assistant.

Examples:

```bash
inspecto integrations install codex --host-ide vscode
inspecto integrations path codex
inspecto integrations install claude-code --scope project --host-ide vscode
inspecto integrations install cursor --host-ide cursor
```

#### `inspecto integrations doctor`

Runs integration preflight checks for a selected assistant without writing files, installing extensions, opening IDE windows, or launching onboarding.

Examples:

```bash
inspecto integrations doctor codex --host-ide cursor
inspecto integrations doctor gemini --host-ide trae-cn --compact
inspecto integrations doctor codex --host-ide cursor --json
```

Use `--compact` when you want a shorter human-readable summary. Use `--json` when the result will be consumed by tooling or CI.

Recommended workflow:

1. Run `inspecto integrations install <assistant> --host-ide <ide>` from the target project root.
2. Use `inspecto integrations doctor <assistant> --host-ide <ide> --compact` only when you want to check blockers before install.
3. Use `--json` instead of `--compact` when the result is consumed by scripts or CI.

##### JSON contract

`inspecto integrations doctor <assistant> --json` prints a single JSON object with this shape:

```json
{
  "schemaVersion": "1",
  "status": "ok",
  "assistant": "codex",
  "assets": [".agents/skills/inspecto-onboarding-codex/SKILL.md"],
  "message": "Preview complete. Inspecto did not write files or open IDE windows. Review the resolved setup below, then rerun without --preview to apply it.",
  "nextStep": "Run the same command again without --preview to apply the integration and launch onboarding.",
  "automation": {
    "status": "preview",
    "message": "Preview complete. Inspecto did not write files or open IDE windows. Review the resolved setup below, then rerun without --preview to apply it.",
    "nextStep": "Run the same command again without --preview to apply the integration and launch onboarding.",
    "details": {
      "hostIde": {
        "id": "cursor",
        "label": "Cursor",
        "source": "from --host-ide",
        "confidence": "high",
        "candidates": ["cursor"]
      },
      "inspectoExtension": {
        "source": "marketplace",
        "reference": "inspecto.inspecto",
        "binaryAvailable": true,
        "binaryPath": "cursor",
        "status": "preview_ready"
      },
      "runtime": {
        "assistant": "Codex",
        "ready": true,
        "mode": "cli"
      },
      "workspace": {
        "path": "/repo",
        "attempted": true
      },
      "onboarding": {
        "uri": "cursor://inspecto.inspecto/send?...",
        "autoSend": true
      }
    }
  }
}
```

Top-level fields:

- `schemaVersion`: Contract version for `inspecto integrations doctor --json`. The current documented value is `1`.
- `status`: `ok` or `blocked`. This is the field most callers should branch on.
- `assistant`: The requested integration target.
- `assets`: The integration files that `inspecto integrations install <assistant>` would write.
- `message`: Human-readable summary of the preflight result.
- `nextStep`: Present when the flow is blocked or when there is a recommended follow-up action.
- `automation`: The underlying preflight result from the IDE/runtime automation layer.

`automation.status` values:

- `preview`: Preflight succeeded. The flow is runnable.
- `preview_blocked`: Preflight found blocking issues before launch.
- `blocked`: Host IDE resolution failed before preflight could complete.

`automation.details` fields:

- `hostIde`: Resolved host IDE, confidence, resolution source, and alternative candidates.
- `inspectoExtension`: How Inspecto would be installed into the host IDE.
  `source` is `marketplace` or `local_vsix`.
  `status` is one of:
  `preview_ready`, `missing_host_ide_binary`, `missing_local_vsix`.
- `runtime`: Resolved assistant runtime.
  `mode` is the selected runtime mode such as `extension` or `cli`.
  `ready=false` means the assistant cannot run yet in the chosen host IDE.
- `workspace`: Target workspace routing information.
- `onboarding`: Final onboarding URI and whether `autoSend` would be requested.

##### Exit codes

- Exit code `0`: `status=ok`
- Exit code `1`: `status=blocked`

This makes `inspecto integrations doctor` safe to use directly in CI and shell conditionals:

```bash
if inspecto integrations doctor codex --host-ide cursor --json; then
  echo "integration is runnable"
else
  echo "integration is blocked"
fi
```

### `inspecto doctor`

A diagnostic command to verify your current environment.

**Features:**

- Checks if the current project is a recognized framework/build tool.
- Verifies if the IDE is supported.
- Scans for available AI tools (both CLI and Plugin modes).
- Validates the current Inspecto installation and configuration.
- Supports `--json` for agent-friendly diagnostics.

### `inspecto init`

The guided/manual fallback for scaffolding Inspecto into a project. It performs a comprehensive environmental analysis and automatically configures Inspecto in one step.

**Features:**

- **Package Manager Detection:** Auto-detects `npm`, `pnpm`, `yarn`, or `bun`.
- **Build Tool / Framework Detection:** Detects Vite, Webpack, Rspack, Rsbuild, and others. Supports legacy versions (e.g., `@rspack/cli < 0.4.0`).
- **IDE Detection:** Prioritizes environment variables, then falls back to directory structures to accurately detect VS Code, Cursor, Trae, Windsurf, or WebStorm.
- **AI Tool Detection:** Scans for both CLI-based tools (Claude, Coco, CodeX, Gemini) and IDE Plugins (GitHub Copilot, Claude Code, Gemini, CodeX).
- **Interactive Prompts:** If multiple build configurations or AI tools are detected, it presents an interactive prompt for you to select your preferred configuration.
- **AST Injection:** Safely injects the `@inspecto-dev/plugin` into your Vite configuration file (`vite.config.ts`, etc.) using AST transformation, preventing duplicate injections. Manual setup is required for other build tools.
- **IDE Extension Installation:** Uses a robust 4-level waterfall strategy to install the necessary IDE extension.
- **Configuration Scaffolding:** Generates the `.inspecto/settings.local.json` file tailored to your detected or selected AI tools, and updates `.gitignore` to prevent committing local settings.

### `inspecto teardown`

A clean-up command to remove Inspecto from your project.

**Features:**

- Uninstalls `@inspecto-dev/plugin` and `@inspecto-dev/cli`.
- Provides manual instructions to remove the plugin from your build configuration file (AST removal is currently unsupported).
- Deletes the `.inspecto` directory and its contents.
- Restores `.gitignore` by removing Inspecto-specific rules.

## Technical Details

### Waterfall Degradation Strategy

The CLI employs a resilient fallback strategy for certain operations, such as installing IDE extensions.

**IDE Extension Installation Levels:**

1. **PATH Command:** Attempts to use the IDE's CLI command (e.g., `code --install-extension`).
2. **Binary Path:** Searches known default installation paths for the IDE binary across different operating systems (macOS, Linux, Windows).
3. **URI Scheme:** Uses the IDE's deep-link URI scheme (e.g., `vscode:extension/inspecto...`).
4. **Manual:** If all else fails, provides explicit instructions for the user to install the extension manually.

### AI Tool Detection

The CLI intelligently detects AI tools across two modes:

- **CLI Mode:** Checks the system `PATH` for known executables (e.g., `claude`, `coco`).
- **Plugin Mode:** Checks the IDE's extension directories (e.g., `~/.vscode/extensions`) for known plugin IDs.

When a tool supports both modes, the CLI merges the detections and presents a unified option to the user, configuring the `settings.local.json` accordingly.
