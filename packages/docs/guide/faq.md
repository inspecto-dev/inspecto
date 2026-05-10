# Troubleshooting & FAQ

If you encounter issues while using Inspecto (such as no highlights, failed message sending, etc.), please prioritize using our environment diagnostic tool.

## Run One-Click Diagnostics (Doctor)

Run the following command in the root directory of your project:

```bash
npx @inspecto-dev/cli doctor
```

The CLI will automatically check:

1. Whether your project dependencies and environments are supported.
2. Whether the core Inspecto plugin is installed correctly.
3. Whether there are configuration conflicts between your IDE and AI assistant.

If you are using an onboarding integration, you can also run doctor against your specific assistant and IDE:

```bash
npx @inspecto-dev/cli integrations doctor <assistant> --host-ide <ide>
```

- **💡 Tip**: When reporting issues, please share the `doctor` output with us (e.g., attach the logs or screenshot). It helps the team triage faster.

---

If `doctor` finds no anomalies but Inspecto still isn't working normally, please refer to the common scenarios below.

## Common Issues

### 1. `Alt` + `Click` `Quick jump` or Inspecto highlighting does not work?

- **Dev Server not restarted**: After onboarding, `init`, or modifying build configurations, you must restart your development server (e.g., re-run `npm run dev`).
- **Unsupported framework version**: Please refer to the documentation to ensure your project's build and UI frameworks are supported.
- **Shortcut conflict**: Your system or browser might be overriding the `Alt` key. You can change the trigger key in the Inspecto configuration file.

### 2. Page highlights work, but `Inspect mode`, `Annotate mode`, or source opening does nothing?

- **For source jump**: the Inspecto IDE extension is not required. Make sure your local dev server is running, your editor is installed, and `ide` in `.inspecto/settings.local.json` matches the editor you want to open.
- **For IDE assistant handoff**: the Inspecto IDE extension must be installed and **enabled** in your editor.
- **Target AI tool misconfigured**: Inspecto needs to know which AI to send the code to. Check the `provider.default` field in your `.inspecto/settings.local.json` file and ensure it points to your active AI assistant (e.g., `"copilot.extension"` or `"claude-code.cli"`). This is only needed for AI handoff, not for plain source jump.
- **Cross-device/environment issues**: Currently, Inspecto relies on local networking for Browser-IDE communication. If you are running the frontend on a remote server (like Remote SSH or a DevContainer) but accessing it from a local browser, the connection might fail.

### 3. Assistant onboarding or `npx @inspecto-dev/cli init` failed?

- **Manual configuration required**: Although the CLI is smart, highly customized project setups (like complex Monorepos or custom Vite/Webpack configs) might cause automated code injection to fail. In this case, please refer to the official documentation and follow the **"Manual Installation"** steps to introduce the plugin in your `vite.config.ts` or `webpack.config.js` manually.

### 4. Why do I see `Failed to launch URI...` or “No application knows how to open URL ...”?

- **This is usually not an assistant-specific issue. It is typically a host IDE configuration or URI scheme mismatch**: Inspecto relies on the host IDE's URI scheme when sending context, opening chat, or jumping to files. If the machine has one IDE variant installed but runtime resolves to another variant, the operating system may reject the URI.
- **A common example is mixing up `Trae` and `Trae CN`**: if the machine has `Trae CN` installed but runtime resolves to `trae`, Inspecto will try to open `trae://...` and macOS will reject it. The same pattern can occur with VS Code and Cursor IDE variants as well.
- **Use doctor to inspect the resolved host IDE**: Run `npx @inspecto-dev/cli integrations doctor <assistant> --host-ide <ide> --json` from the project root and confirm that `hostIde` matches the IDE you actually use.
- **Pin the host IDE explicitly**: If you know which IDE variant you are using, set `ide` explicitly in `.inspecto/settings.local.json` or `.inspecto/settings.json`. For example, if you use `Trae CN`:

```json
{
  "ide": "trae-cn",
  "provider.default": "coco.cli"
}
```

- **Restart the IDE and dev server after updating the config**: This ensures runtime picks up the new value and emits the expected URI scheme.
- **If it still fails**: Run the matching URI scheme test for your IDE on macOS, for example `open "<scheme>://"` to verify that the operating system has registered that IDE correctly.

### 5. Why doesn't my custom workflow button appear?

- **Check the file location**: workflow buttons come from `.inspecto/prompts.json` or `.inspecto/prompts.local.json`.
- **Check the shape**: a workflow item must include `"kind": "workflow"`, a unique `id`, and a non-empty `prompt`.
- **Check visibility**: `enabled: false` hides the workflow.
- **Restart or wait for config reload**: the dev server watches `.inspecto/`, but after large setup changes a restart is still the safest path.
- **Use Annotate mode**: workflow buttons are shown in the Annotate sidebar, not in the single-element Inspect menu.

### 6. What is the difference between an annotation task and a workflow session?

- **Annotation task**: starts from selected DOM elements and notes. Use it for UI fixes, design review comments, and component-level work.
- **Workflow session**: starts from a configured project command in `prompts.json`. It can run even with no selected DOM annotations. Use it for deploy, PR, release, test, or documentation automation.

For MCP workflow sessions, Inspecto appends project metadata such as project root, current branch, and git status so the agent can use its own skills, MCP servers, and tools safely.

### 7. I created an MCP task, but the agent did not pick it up. What should I check?

- Make sure `.inspecto/settings.local.json` contains `"annotate.channel": "mcp"`.
- Make sure your AI client has the Inspecto MCP server configured and points to the correct local dev server.
- Ask the agent to claim work explicitly, for example: `Please process my Inspecto tasks`.
- If the agent was waiting in continuous mode, its tool call may have timed out before you clicked `Create Task`; ask it to claim again.
- Keep the browser page open if you want to see live timeline updates.

### 8. Can workflow buttons accidentally deploy or modify production?

Inspecto only queues the instruction you configured. The actual execution depends on the agent and the tools/skills/MCP servers available to it. For sensitive actions, set `"confirm": true` in the workflow item, and write the prompt with explicit guardrails such as “deploy preview only” or “ask before production deploy”.

### 9. Will the production (live) environment be affected?

- **Not at all**. Inspecto's plugins and code injection logic **only operate in the development environment**. When bundling for production, it is automatically skipped, causing zero runtime overhead and absolutely no impact on production performance or security.
