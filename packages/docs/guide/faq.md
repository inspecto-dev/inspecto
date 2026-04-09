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

### 2. Page highlights work, but `Inspect mode`, `Annotate mode`, or source opening does nothing in IDE / no code in AI chat?

- **IDE plugin not installed/enabled**: Ensure the Inspecto plugin is installed and **enabled** in your editor.
- **Target AI tool misconfigured**: Inspecto needs to know which AI to send the code to. Check the `provider.default` field in your `.inspecto/settings.local.json` file and ensure it points to your active AI assistant (e.g., `"copilot.extension"` or `"claude-code.cli"`).
- **Cross-device/environment issues**: Currently, Inspecto relies on local networking for Browser-IDE communication. If you are running the frontend on a remote server (like Remote SSH or a DevContainer) but accessing it from a local browser, the connection might fail.

### 3. Assistant onboarding or `inspecto init` failed?

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

### 5. Will the production (live) environment be affected?

- **Not at all**. Inspecto's plugins and code injection logic **only operate in the development environment**. When bundling for production, it is automatically skipped, causing zero runtime overhead and absolutely no impact on production performance or security.
