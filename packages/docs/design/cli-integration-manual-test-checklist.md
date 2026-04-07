# CLI Integration Manual Test Checklist

Target project:

- `/Users/bytedance/Works/hugo.felix/cli-0.3.2`

CLI path:

- `/Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js`

Test environment:

- [ ] Close all VS Code windows before each isolated scenario unless the case explicitly requires multi-window behavior.
- [ ] Confirm the target window is opened on `/Users/bytedance/Works/hugo.felix/cli-0.3.2`.
- [ ] Confirm `Inspecto` is installed and enabled in VS Code.
- [ ] Confirm the corresponding assistant extension is installed and enabled before each assistant-specific case.
- [ ] Keep `Output -> Log (Extension Host)` available for URI/handler debugging when needed.

State definitions:

- `Warm state`: this machine has previously installed integration assets and host IDE extensions.
- `Cold state`: remove the target integration assets, remove or disable `Inspecto` in the host IDE, and remove or disable the target assistant runtime when the case requires a fully fresh first-install path.

Cold-state reset checklist:

- [ ] Remove the target assistant's integration asset directory from the project before a cold test.
- [ ] Remove or disable the `Inspecto` extension in the target IDE before a cold test.
- [ ] Remove or disable the assistant extension or CLI runtime when the case explicitly requires runtime-missing behavior.
- [ ] Fully quit the target IDE before rerunning the cold install case.

## A. Preview Baseline

- [ ] `codex --preview`

  ```bash
  node /Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js integrations install codex --host-ide vscode --force --preview
  ```

  Expected:
  - Step 1-6 are preview-only.
  - URI includes `target=codex`.
  - URI includes `autoSend=true`.
  - URI includes `workspace=%2FUsers%2Fbytedance%2FWorks%2Fhugo.felix%2Fcli-0.3.2`.
  - URI includes `overrides=%7B%22type%22%3A%22extension%22%7D`.

- [ ] `copilot --preview`

  ```bash
  node /Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js integrations install copilot --host-ide vscode --force --preview
  ```

  Expected:
  - URI includes `target=copilot`.
  - URI includes `autoSend=true`.

- [ ] `claude-code --preview`
  ```bash
  node /Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js integrations install claude-code --scope project --host-ide vscode --force --preview
  ```
  Expected:
  - URI includes `target=claude-code`.
  - URI includes `autoSend=false`.

## B. Success Paths

Warm-state baseline:

- [ ] `codex install`

  ```bash
  cd /Users/bytedance/Works/hugo.felix/cli-0.3.2
  node /Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js integrations install codex --host-ide vscode --force
  ```

  Expected:
  - Codex integration assets are installed.
  - Host IDE resolves to VS Code.
  - Inspecto extension is installed or already installed.
  - Workspace is opened in VS Code.
  - Onboarding is launched in VS Code.
  - Codex is actually opened.
  - `Set up Inspecto in this project` is automatically sent.

- [ ] `copilot install`

  ```bash
  cd /Users/bytedance/Works/hugo.felix/cli-0.3.2
  node /Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js integrations install copilot --host-ide vscode --force
  ```

  Expected:
  - Copilot chat opens.
  - The setup prompt is automatically sent.

- [ ] `claude-code install`
  ```bash
  cd /Users/bytedance/Works/hugo.felix/cli-0.3.2
  node /Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js integrations install claude-code --scope project --host-ide vscode --force
  ```
  Expected:
  - Claude Code opens.
  - The setup prompt is inserted.
  - It is not auto-submitted.

Cold-state first-install coverage:

- [ ] Cold `codex install` with no existing Inspecto extension and no existing Codex runtime

  ```bash
  cd /Users/bytedance/Works/hugo.felix/cli-0.3.2
  node /Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js integrations install codex --host-ide vscode --force
  ```

  Expected:
  - Codex assets are created from scratch.
  - Inspecto extension installation path is exercised from a cold state.
  - If Codex runtime is missing, CLI stops with actionable guidance instead of claiming onboarding launched.
  - If Codex runtime is present, onboarding launches successfully.

- [ ] Cold `copilot install` with no existing Inspecto extension and no existing Copilot runtime

  ```bash
  cd /Users/bytedance/Works/hugo.felix/cli-0.3.2
  node /Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js integrations install copilot --host-ide vscode --force
  ```

  Expected:
  - Copilot assets are created from scratch.
  - Inspecto extension installation path is exercised from a cold state.
  - If Copilot runtime is missing, CLI stops with actionable guidance.
  - If Copilot runtime is present, onboarding launches successfully.

- [ ] Cold `claude-code install` with no existing Inspecto extension and no existing Claude runtime

  ```bash
  cd /Users/bytedance/Works/hugo.felix/cli-0.3.2
  node /Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js integrations install claude-code --scope project --host-ide vscode --force
  ```

  Expected:
  - Claude Code assets are created from scratch.
  - Inspecto extension installation path is exercised from a cold state.
  - If Claude runtime is missing, CLI stops with actionable guidance.
  - If Claude runtime is present, onboarding launches successfully.

- [ ] Cold `cursor install` with no existing Inspecto extension in Cursor

  ```bash
  cd /Users/bytedance/Works/hugo.felix/cli-0.3.2
  node /Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js integrations install cursor --host-ide cursor --force
  ```

  Expected:
  - Cursor assets are created from scratch.
  - Inspecto extension installation path is exercised from a cold state.
  - Cursor onboarding launches successfully.

- [ ] Cold `trae install` with no existing Inspecto extension in Trae CN
  ```bash
  cd /Users/bytedance/Works/hugo.felix/cli-0.3.2
  node /Users/bytedance/Works/hugo.felix/inspecto/packages/cli/dist/bin.js integrations install trae --host-ide trae-cn --force
  ```
  Expected:
  - Trae assets are created from scratch.
  - Inspecto extension installation path is exercised from a cold state.
  - Trae CN onboarding launches successfully.

## C. Workspace Routing

- [ ] Single-window direct URI with `workspace`
  1. Run the `codex --preview` command.
  2. Copy the full URI from Step 6.
  3. Execute:

  ```bash
  open 'vscode://inspecto.inspecto/send?...'
  ```

  Expected:
  - No extension host crash.
  - Codex onboarding opens successfully.

- [ ] Direct URI without `workspace`

  ```bash
  open 'vscode://inspecto.inspecto/send?target=codex&prompt=test&autoSend=true&overrides=%7B%22type%22%3A%22extension%22%7D'
  ```

  Expected:
  - Codex opens.
  - Prompt is sent.

- [ ] Direct URI with valid `workspace`

  ```bash
  open 'vscode://inspecto.inspecto/send?target=codex&prompt=test&autoSend=true&workspace=%2FUsers%2Fbytedance%2FWorks%2Fhugo.felix%2Fcli-0.3.2&overrides=%7B%22type%22%3A%22extension%22%7D'
  ```

  Expected:
  - Codex opens.
  - Prompt is sent.
  - No extension host runtime error.

- [ ] Direct URI with invalid `workspace`
  ```bash
  open 'vscode://inspecto.inspecto/send?target=codex&prompt=test&autoSend=true&workspace=%2Ftmp%2Fnot-this-project&overrides=%7B%22type%22%3A%22extension%22%7D'
  ```
  Expected:
  - Onboarding does not open.
  - Extension host logs show the URI was ignored for unrelated workspace.
  - No crash.

## D. Multi-Window Safety

- [ ] Two VS Code windows open on different projects, then run `codex install`
      Expected:
  - The target project window receives onboarding.
  - The wrong window does not receive onboarding.
  - No assistant misrouting.

- [ ] `codex install` must not open Copilot.

- [ ] `copilot install` must not open Codex.

- [ ] `claude-code install` must not open Copilot or Codex.

## E. Idempotence

- [ ] Repeat `codex install` twice.
      Expected:
  - No fatal errors on the second run.
  - Existing assets/extensions do not break onboarding launch.

- [ ] Repeat `copilot install` twice.

- [ ] Repeat `claude-code install` twice.

## F. Missing Runtime And Missing IDE Binary

- [ ] `codex install` when Codex extension and `codex` CLI are both unavailable
      Expected:
  - CLI stops at runtime resolution.
  - It prints guidance to install the Codex plugin or CLI.
  - It does not claim onboarding opened.

- [ ] `claude-code install` when Claude extension and `claude` CLI are both unavailable
      Expected:
  - CLI stops at runtime resolution.
  - It prints guidance to install the Claude plugin or CLI.
  - It does not claim onboarding opened.

- [ ] `gemini install` when Gemini extension and `gemini` CLI are both unavailable
      Expected:
  - CLI stops at runtime resolution.
  - It prints guidance to install the Gemini plugin or CLI.
  - It does not claim onboarding opened.

- [ ] `--preview` when the host IDE binary is unavailable
      Expected:
  - Preview reports a blocked or preflight failure.
  - It explains that the host IDE binary could not be found.
  - It does not claim onboarding can launch automatically.

## G. First-Activation And Retry Timing

- [ ] Cold install immediately after first-time Inspecto extension install
      Expected:
  - No extension host crash.
  - If onboarding does not appear, the CLI still provides actionable retry guidance.

- [ ] Re-run the same cold install command immediately after the first run
      Expected:
  - The second run succeeds cleanly.
  - No duplicate asset corruption.
  - No false success message if the runtime is still missing.

## H. Error Handling

- [ ] Missing `prompt`

  ```bash
  open 'vscode://inspecto.inspecto/send?target=codex'
  ```

  Expected:
  - VS Code shows `inspecto: missing prompt`.
  - No crash.

- [ ] Missing `target`
  ```bash
  open 'vscode://inspecto.inspecto/send?prompt=test'
  ```
  Expected:
  - VS Code shows `inspecto: missing target`.
  - No crash.

## I. Installed Asset Verification

- [ ] Codex assets exist under:
  - `.agents/skills/inspecto-onboarding-codex/SKILL.md`
  - `.agents/skills/inspecto-onboarding-codex/agents/openai.yaml`
  - `.agents/skills/inspecto-onboarding-codex/scripts/run-inspecto.sh`

- [ ] Copilot assets exist under:
  - `.github/skills/inspecto-onboarding/SKILL.md`

- [ ] Claude Code project-scope assets exist under the expected `.claude/skills/...` location for the target project.

## J. Extension Health

- [ ] `Inspecto: Help` command is available in the command palette.

- [ ] `Inspecto: Report IDE to Dev Server` command is available in the command palette.

- [ ] `Developer: Show Running Extensions` shows `Inspecto` active during integration testing.

- [ ] `Developer: Show Running Extensions` shows the assistant extension active during its corresponding test.

## K. Flaky Observation Log

- [ ] Record any one-off timing issues or non-reproducible behaviors here.
      Notes:
  - Date:
  - Assistant / host IDE:
  - Warm or cold state:
  - Exact command:
  - Observed behavior:
  - Was it reproducible:
  - Relevant logs:

## Result Summary

- [ ] All preview cases passed.
- [ ] All success-path assistant cases passed.
- [ ] All cold-state first-install cases passed.
- [ ] All workspace-routing cases passed.
- [ ] All multi-window safety cases passed.
- [ ] All idempotence cases passed.
- [ ] All missing-runtime and missing-binary cases passed.
- [ ] All first-activation and retry-timing cases passed.
- [ ] All error-handling cases passed.
- [ ] All asset verification cases passed.
- [ ] All extension health checks passed.
