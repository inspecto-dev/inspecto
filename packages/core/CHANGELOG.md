# @inspecto-dev/core

## 0.3.5

### Patch Changes

- 2be449f: fix: improve cli onboarding and default extension handling
- 22c1046: Improve overlay menu positioning and interaction behavior.
- Updated dependencies [2be449f]
  - @inspecto-dev/types@0.3.5

## 0.3.4

### Patch Changes

- 58780b8: Improve Inspecto onboarding reliability across assistant integrations.
  - add stable build target selection via candidate IDs
  - improve webpack and rspack config detection, including wrapper-script resolution
  - support legacy Rspack and Webpack 4 onboarding with explicit manual follow-up
  - persist configured host IDE into project settings and clarify doctor precedence on IDE mismatches
  - preserve selected host IDE and assistant provider defaults when onboarding a subproject target

- a7cbda9: Improve inspect mode's `Fix UI` flow by attaching CSS context automatically.
  - automatically include captured CSS context for the built-in `fix-ui` intent
  - keep the header CSS toggle as an explicit override for non-UI intents
  - add regression coverage to preserve the new intent-specific behavior

- Updated dependencies [58780b8]
- Updated dependencies [a7cbda9]
  - @inspecto-dev/types@0.3.4

## 0.3.3

### Patch Changes

- Stabilize onboarding and browser-to-IDE dispatch flows across CLI and IDE integrations.
- Updated dependencies
  - @inspecto-dev/types@0.3.3

## 0.3.2

### Patch Changes

- - feat: migrate all 7 integrations to Native Agent Skills
  - feat: add automated onboarding experience via URI schemes
  - refactor: use shared capabilities strategy for tool detection
  - docs: synchronize english and chinese documentation
  - fix: update travis and action test configurations
- Updated dependencies
  - @inspecto-dev/types@0.3.2

## 0.3.1

### Patch Changes

- fix: polish onboarding and architecture visualization
- Updated dependencies
  - @inspecto-dev/types@0.3.1

## 0.3.0

### Minor Changes

- First stable release for Inspecto's browser-first workflow.
  - unify onboarding around assistant-first setup and the single-entry `inspecto onboard --json` contract
  - stabilize the browser UX across `Inspect`, `Annotate`, and `Alt + Click` quick jump
  - tighten prompt and settings schema boundaries and keep evidence toggles built-in
  - refresh README, website, onboarding docs, and playgrounds to match the shipped workflow
  - refactor large runtime modules without intended behavior changes

### Patch Changes

- Updated dependencies
  - @inspecto-dev/types@0.3.0

## 0.2.0-alpha.4

### Minor Changes

- release alpha test version

### Patch Changes

- Updated dependencies
  - @inspecto-dev/types@0.2.0-alpha.4

## 0.2.0-alpha.3

### Minor Changes

- release alpha test version

### Patch Changes

- Updated dependencies
  - @inspecto-dev/types@0.2.0-alpha.3

## 0.2.0-alpha.2

### Minor Changes

- release alpha test version

### Patch Changes

- Updated dependencies
  - @inspecto-dev/types@0.2.0-alpha.2

## 0.2.0-alpha.1

### Minor Changes

- release test version

### Patch Changes

- Updated dependencies
  - @inspecto-dev/types@0.2.0-alpha.1

## 0.2.0-alpha.0

### Minor Changes

- b3cd76b: Initial release of Inspecto

### Patch Changes

- release first internal alpha version
- Updated dependencies
- Updated dependencies [b3cd76b]
  - @inspecto-dev/types@0.2.0-alpha.0
