# Onboarding Contract

This page documents the machine-readable contract for Inspecto's skill-first onboarding flow. It is intended for agent, skill, and automation authors who need to call the CLI safely without scraping human-readable output.

The flow is:

1. `inspecto detect --json`
2. `inspecto plan --json`
3. `inspecto apply --json`
4. `inspecto doctor --json`

## Stability

Inspecto treats these JSON responses as a public integration surface.

- Existing field meanings should remain stable.
- New fields may be added over time.
- Consumers should ignore unknown fields.
- Do not parse human-readable text from non-JSON output.

## Shared Semantics

### `status`

All onboarding commands return a top-level `status`:

- `ok`: the command completed without blockers or required follow-up.
- `warning`: the command completed, but follow-up or caution is required.
- `blocked`: the environment or plan cannot proceed automatically.
- `error`: the command failed unexpectedly or the CLI could not complete the requested action.

### Messages

Structured messages use:

```json
{
  "code": "string",
  "message": "string"
}
```

`code` is the stable automation key. `message` is intended for direct display to the user.

### Paths

- `project.root` is an absolute path.
- Planned or applied file targets are reported as project-relative paths unless noted otherwise.

## `inspecto detect --json`

`detect` reports the normalized environment that Inspecto sees before any onboarding plan is chosen.

```json
{
  "status": "ok",
  "warnings": [],
  "blockers": [],
  "project": {
    "root": "/repo",
    "packageManager": "pnpm"
  },
  "environment": {
    "frameworks": ["react"],
    "unsupportedFrameworks": [],
    "buildTools": [
      {
        "tool": "vite",
        "configPath": "vite.config.ts",
        "label": "Vite (vite.config.ts)"
      }
    ],
    "unsupportedBuildTools": [],
    "ides": [
      {
        "ide": "vscode",
        "supported": true
      }
    ],
    "providers": [
      {
        "id": "codex",
        "label": "Codex CLI",
        "supported": true,
        "preferredMode": "cli"
      }
    ]
  }
}
```

Notes:

- `environment.providers[].id` is the provider identifier used later for defaults.
- `preferredMode` tells consumers whether the provider should be written as `providerId.cli` or `providerId.extension`.
- `blockers` indicates detection-level conditions that prevent smooth auto-onboarding.

## `inspecto plan --json`

`plan` resolves the onboarding strategy and the actions Inspecto intends to take.

```json
{
  "status": "ok",
  "warnings": [],
  "blockers": [],
  "strategy": "supported",
  "actions": [
    {
      "type": "install_dependency",
      "target": "@inspecto-dev/plugin @inspecto-dev/core",
      "description": "Install the Inspecto runtime packages."
    },
    {
      "type": "modify_file",
      "target": "vite.config.ts",
      "description": "Inject the Inspecto plugin into Vite (vite.config.ts)."
    },
    {
      "type": "install_extension",
      "target": "vscode",
      "description": "Install the Inspecto VS Code extension."
    }
  ],
  "defaults": {
    "provider": "codex",
    "ide": "vscode",
    "shared": true,
    "extension": true
  }
}
```

Field notes:

- `strategy` is one of `supported`, `manual`, or `unsupported`.
- `actions[].type` is one of `install_dependency`, `modify_file`, `install_extension`, or `manual_step`.
- `defaults.provider` is the provider id, not the final settings string. Consumers should combine it with the detected provider's `preferredMode`.
- `blocked` plans are expected for unsupported stacks, missing build tools, or multi-target monorepo roots that need the user to rerun inside a single app.

## `inspecto apply --json`

`apply` executes the current onboarding plan for the working directory and returns both the resolved plan and the recorded mutations.

```json
{
  "status": "warning",
  "plan": {
    "status": "ok",
    "warnings": [],
    "blockers": [],
    "strategy": "supported",
    "actions": [],
    "defaults": {
      "provider": "codex",
      "ide": "vscode",
      "shared": true,
      "extension": true
    }
  },
  "mutations": [
    {
      "type": "dependency_added",
      "name": "@inspecto-dev/plugin",
      "dev": true
    },
    {
      "type": "file_created",
      "path": ".inspecto/settings.json"
    },
    {
      "type": "file_modified",
      "path": ".gitignore",
      "description": "Appended .inspecto/ ignore rules"
    }
  ],
  "postInstall": {
    "installFailed": false,
    "injectionFailed": false,
    "manualExtensionInstallNeeded": true,
    "nextSteps": ["Install the Inspecto IDE extension manually"]
  }
}
```

Field notes:

- `status` is the merged outcome of plan resolution and execution.
- `plan` is the same shape returned by `inspecto plan --json`.
- `mutations` records what Inspecto changed or installed.
- `postInstall.nextSteps` is the canonical list of follow-up actions for the user.
- `status: blocked` with empty `mutations` means the current directory cannot be auto-applied safely.

## `inspecto doctor --json`

`doctor` reports the current health of an Inspecto setup or a failed onboarding attempt.

```json
{
  "status": "blocked",
  "summary": {
    "errors": 2,
    "warnings": 1
  },
  "project": {
    "root": "/repo",
    "packageManager": "pnpm"
  },
  "errors": [
    {
      "code": "plugin-not-configured",
      "status": "error",
      "message": "Plugin not configured in any build config",
      "hints": ["Fix: npx @inspecto-dev/cli init"]
    }
  ],
  "warnings": [
    {
      "code": "provider-missing",
      "status": "warning",
      "message": "Provider: none detected",
      "hints": ["Inspecto works best with Claude Code, Trae CLI, or GitHub Copilot"]
    }
  ],
  "checks": [
    {
      "code": "framework-supported",
      "status": "ok",
      "message": "Framework: react",
      "hints": []
    }
  ]
}
```

Field notes:

- `errors` and `warnings` are filtered subsets of `checks`.
- `checks[].status` is one of `ok`, `warning`, or `error`.
- `hints` is intended for user-facing remediation text.
- Automation should branch on `code` and `status`, not on `message`.

## Minimal Onboarding Consumer Flow

Recommended consumer behavior:

1. Run `inspecto detect --json`.
2. If `status` is `blocked`, surface `blockers` and stop.
3. Run `inspecto plan --json`.
4. Show `actions`, `warnings`, and `blockers` to the user for approval.
5. Run `inspecto apply --json`.
6. If `apply.status` is `warning`, show `postInstall.nextSteps`.
7. If `apply.status` is `blocked` or `error`, run `inspecto doctor --json` and present the resulting diagnostics.

## Current Limitations

- `inspecto apply` currently derives its plan from the current working directory. It does not yet accept a serialized plan payload over stdin or file input.
- Multi-app monorepo roots may return manual guidance instead of an auto-applicable plan.
- Consumers should treat `manual_step` actions and `postInstall.nextSteps` as mandatory user-visible output.
