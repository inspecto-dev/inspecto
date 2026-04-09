---
'@inspecto-dev/cli': patch
'@inspecto-dev/core': patch
'@inspecto-dev/plugin': patch
'@inspecto-dev/types': patch
---

Improve Inspecto onboarding reliability across assistant integrations.

- add stable build target selection via candidate IDs
- improve webpack and rspack config detection, including wrapper-script resolution
- support legacy Rspack and Webpack 4 onboarding with explicit manual follow-up
- persist configured host IDE into project settings and clarify doctor precedence on IDE mismatches
