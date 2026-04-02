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

- **💡 Tip**: When reporting issues, please share the `doctor` output with us (e.g., attach the logs or screenshot). It helps the team triage faster.

---

If `doctor` finds no anomalies but Inspecto still isn't working normally, please refer to the common scenarios below.

## Common Issues

### 1. Holding `Alt` doesn't show the highlight mask?

- **Dev Server not restarted**: After running `init` or modifying build configurations, you must restart your development server (e.g., re-run `npm run dev`).
- **Unsupported framework version**: Please refer to the documentation to ensure your project's build and UI frameworks are supported.
- **Shortcut conflict**: Your system or browser might be overriding the `Alt` key. You can change the trigger key in the Inspecto configuration file.

### 2. Page highlights work, but clicking does nothing in IDE / no code in AI chat?

- **IDE plugin not installed/enabled**: Ensure the Inspecto plugin is installed and **enabled** in your editor.
- **Target AI tool misconfigured**: Inspecto needs to know which AI to send the code to. Check the `provider.default` field in your configuration file and ensure it points to your active AI assistant (e.g., `"copilot.extension"` or `"claude-code.cli"`).
- **Cross-device/environment issues**: Currently, Inspecto relies on local networking for Browser-IDE communication. If you are running the frontend on a remote server (like Remote SSH or a DevContainer) but accessing it from a local browser, the connection might fail.

### 3. CLI `init` execution failed?

- **Manual configuration required**: Although the CLI is smart, highly customized project setups (like complex Monorepos or custom Vite/Webpack configs) might cause automated code injection to fail. In this case, please refer to the official documentation and follow the **"Manual Installation"** steps to introduce the plugin in your `vite.config.ts` or `webpack.config.js` manually.

### 4. Will the production (live) environment be affected?

- **Not at all**. Inspecto's plugins and code injection logic **only operate in the development environment**. When bundling for production, it is automatically skipped, causing zero runtime overhead and absolutely no impact on production performance or security.
