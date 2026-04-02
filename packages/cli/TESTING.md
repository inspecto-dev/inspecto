# Inspecto CLI Manual Testing Checklist

The Inspecto CLI relies on detecting various project states (package managers, frameworks, build tools, and IDEs) and safely mutating user files via AST parsing. While we have automated tests, the complexity of real-world project configurations means manual end-to-end (E2E) testing is critical before a release.

Use this checklist to perform a comprehensive regression test of the CLI.

---

## Preparation

Create a fresh testing environment using a supported toolchain (e.g., Rsbuild + React) in the `playground/` directory:

```bash
cd playground
npx create-rsbuild@latest test-cli-rspack --template react-ts
cd test-cli-rspack
npm install
```

All the following tests assume you are running the commands from inside `playground/test-cli-rspack`.

---

## Core Scenarios

### Case 1: Initial Setup (The Happy Path)

1. **Action:** Run `node ../../packages/cli/bin/inspecto.js init`
2. **Expectations:**
   - Detects `npm`, `react`, and `Rsbuild (rsbuild.config.ts)`.
   - Detects the current IDE accurately (e.g., VS Code or Trae). If it's not VS Code, it should warn about lack of support.
   - If `@inspecto-dev/plugin` cannot be installed (e.g., registry not ready), it logs the failure but does not crash.
   - Backs up `rsbuild.config.ts` to `rsbuild.config.ts.bak`.
   - Injects the `inspecto()` plugin code safely into `rsbuild.config.ts` without ruining the formatting.
   - Creates a valid `.inspecto/settings.json`.
   - Updates `.gitignore` with fine-grained rules (`install.lock`, `cache.json`, `*.local.json`).
   - If an error occurred during dependency installation or AST injection, the final message should be a yellow warning `⚠ Setup completed with some manual steps required`, **not** the green success `⚡ Ready!`.

### Case 2: Idempotency (Running Init Again)

1. **Action:** Run `node ../../packages/cli/bin/inspecto.js init` again in the exact same directory.
2. **Expectations:**
   - Logs `Plugin already injected in rsbuild.config.ts (skipped)`.
   - Logs `.inspecto/settings.json already exists (skipped)`.
   - The `.gitignore` file is not duplicated.
   - The `.inspecto/install.lock` remains valid and tracks the fact that the file was modified previously.

### Case 3: Doctor Diagnostics

1. **Action:** Run `node ../../packages/cli/bin/inspecto.js doctor`
2. **Expectations:**
   - Prints a clean checklist of the environment.
   - Successfully finds `rsbuild.config.ts` with the plugin injected.
   - Accurately reports whether the VS Code extension is installed (if applicable).
   - Accurately reports missing npm dependencies (if the install failed in Case 1).

### Case 4: Fault Tolerance Diagnostics

1. **Action:**
   - Open `.inspecto/settings.json` and purposely ruin the JSON syntax (e.g., delete a curly brace or add random text).
   - Run `node ../../packages/cli/bin/inspecto.js doctor` again.
2. **Expectations:**
   - Does not crash.
   - Safely catches the JSON parse error and logs `✘ .inspecto/settings.json has invalid JSON`.

### Case 5: Precise Teardown (Rollback)

1. **Action:** Fix the JSON file from Case 4, then run `node ../../packages/cli/bin/inspecto.js teardown`
2. **Expectations:**
   - Reads `.inspecto/install.lock`.
   - Completely restores `rsbuild.config.ts` back to its original state using the `.bak` file, and deletes the `.bak` file.
   - Removes `@inspecto-dev/plugin` from `package.json` `devDependencies` (if it was installed).
   - Cleans up the `# Inspecto` block from `.gitignore`.
   - Deletes the entire `.inspecto/` directory.
   - Leaves no trace behind.

### Case 6: Best-Effort Teardown (Missing Lock File)

1. **Action:**
   - Run `init` again to generate the files.
   - Manually delete the `.inspecto/` folder (which contains `install.lock`).
   - Run `node ../../packages/cli/bin/inspecto.js teardown`
2. **Expectations:**
   - Logs `⚠ No .inspecto/install.lock found. Running in best-effort mode.`
   - Still manages to uninstall the npm dependency.
   - Still manages to clean the `.gitignore` entries.
   - Instructs the user to manually remove the AST injection since there is no backup to restore from.

### Case 7: Ambiguous Config Resolution

1. **Action:**
   - Create an empty dummy file named `vite.config.ts` in the project root to simulate a mixed/conflicting configuration.
   - Run `node ../../packages/cli/bin/inspecto.js init`
2. **Expectations:**
   - The CLI stops and presents an interactive prompt `? Detected multiple build tool configs:`.
   - Allows the user to select either Rsbuild or Vite via arrow keys, or choose "Skip".
   - If the user selects one, it attempts injection on the selected file only.

### Case 8: Interactive IDE Prompt

1. **Action:**
   - Simulate opening the project in multiple IDEs by creating empty directories: `mkdir .vscode && mkdir .idea`.
   - Open your terminal in a different IDE (e.g., Trae or Cursor).
   - Run `node ../../packages/cli/bin/inspecto.js init`
2. **Expectations:**
   - Detects the current terminal IDE **and** the directory artifacts.
   - Pauses and asks `? Detected multiple IDEs:`.
   - Shows which ones are `(supported)` vs `(unsupported)`.
   - Updates `settings.json` with the chosen IDE if it is supported.
