# IDE Extensions

To achieve the magical "Click in browser -> Open AI in IDE" workflow, Inspecto requires a small companion extension to be installed in your code editor. This extension registers the `vscode://` or custom IDE URI schemes that the browser sends payloads to.

## Supported IDEs

- **VS Code**: Fully supported. (`ide: "vscode"`)
- **Cursor**: Fully supported. (`ide: "cursor"`)
- **Trae**: Fully supported. (`ide: "trae"`)
- **Trae CN**: Fully supported. (`ide: "trae-cn"`)
- **CodeBuddy**: Fully supported. (`ide: "codebuddy"`)
- **CodeBuddy CN**: Fully supported. (`ide: "codebuddy-cn"`)
- **None (Standalone/MCP)**: Fully supported. (`ide: "none"`)

_Note: JetBrains IDEs and other editors are not currently supported for direct AI payload injection, but you can still use the "none" option to use the Clipboard and MCP capabilities._

## Installation

When you use assistant-first onboarding or run `npx @inspecto-dev/cli init`, Inspecto will attempt to install the extension into your detected IDE when the platform supports automatic installation.

If you need to install it manually:

### VS Code & Cursor

1. Open the Extensions View (`Ctrl+Shift+X` or `Cmd+Shift+X`).
2. Search for **"Inspecto"**.
3. Click Install.

> **Marketplace Links:**
>
> - [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=inspecto.inspecto)
> - [Open VSX Registry](https://open-vsx.org/extension/inspecto/inspecto) (For Cursor, VSCodium, and other derivatives)

Alternatively, you can install it via the command line:

```bash
# For VS Code
code --install-extension inspecto.inspecto

# For Cursor
cursor --install-extension inspecto.inspecto
```

### Trae, Trae CN, CodeBuddy, and CodeBuddy CN

For these IDEs, the most reliable manual path is to search for "Inspecto" in the built-in plugin marketplace and install it directly.

If a launcher is available in your shell, you can also install from the command line:

```bash
# For Trae
trae --install-extension inspecto.inspecto

# For Trae CN
trae-cn --install-extension inspecto.inspecto

# For CodeBuddy
codebuddy --install-extension inspecto.inspecto

# For CodeBuddy CN, when the dedicated launcher exists
codebuddy-cn --install-extension inspecto.inspecto
```

On macOS, some CodeBuddy app bundles expose `.../Contents/Resources/app/bin/code` instead of `codebuddy` or `codebuddy-cn`. If the launcher command is not on `PATH`, prefer the built-in marketplace or use the app-bundle binary directly.

## How it works

The IDE Extension is extremely lightweight. Its sole purpose is to:

1. Register a protocol handler (e.g., `vscode://inspecto.inspecto/send`, `cursor://inspecto.inspecto/send`, or `codebuddycn://inspecto.inspecto/send`).
2. Receive the payload containing the file path, code snippet, and selected AI tool.
3. Automatically execute the correct internal IDE commands to open the file and trigger the corresponding AI extension (or spawn the CLI in the terminal).

Without this extension, Inspecto cannot complete the normal IDE handoff via URI schemes.

### Standalone / MCP / Browser-only mode (`ide: "none"`)

If you are using MCP integration, want to use a non-supported IDE, or simply don't want to install the IDE extension, you can set `ide: "none"` in your `.inspecto/settings.local.json`.

In this mode:

- **Copy Context**: The Inspecto UI provides a prominent "Copy Context" button that writes the selected elements and their source code paths directly to your clipboard in Markdown format.
- **MCP Integration**: Inspecto can deliver context directly to a running MCP server.
- The browser will not attempt to open `vscode://` or other URI schemes, avoiding any "App not found" alerts.
