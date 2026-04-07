# IDE Extensions

To achieve the magical "Click in browser -> Open AI in IDE" workflow, Inspecto requires a small companion extension to be installed in your code editor. This extension registers the `vscode://` or custom IDE URI schemes that the browser sends payloads to.

## Supported IDEs

- **VS Code**: Fully supported. (`ide: "vscode"`)
- **Cursor**: Fully supported. (`ide: "cursor"`)
- **Trae**: Fully supported. (`ide: "trae"`)
- **Trae CN**: Fully supported. (`ide: "trae-cn"`)

_Note: JetBrains IDEs and other editors are not currently supported for direct AI payload injection._

## Installation

When you use assistant-first onboarding or run `inspecto init`, Inspecto will attempt to install the extension into your detected IDE when the platform supports automatic installation.

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

### Trae & Trae CN

For Trae and Trae CN, you can search for "Inspecto" in the plugin marketplace and install it directly. Alternatively, you can use the command line:

```bash
# For Trae
trae --install-extension inspecto.inspecto

# For Trae CN
trae-cn --install-extension inspecto.inspecto
```

## How it works

The IDE Extension is extremely lightweight. Its sole purpose is to:

1. Register a protocol handler (e.g., `vscode://inspecto.inspecto/send` or `cursor://inspecto.inspecto/send`).
2. Receive the payload containing the file path, code snippet, and selected AI tool.
3. Automatically execute the correct internal IDE commands to open the file and trigger the corresponding AI extension (or spawn the CLI in the terminal).

Without this extension, Inspecto cannot complete the normal IDE handoff. Depending on the selected provider and fallback chain, it may fall back to clipboard delivery instead of opening the IDE target directly.
