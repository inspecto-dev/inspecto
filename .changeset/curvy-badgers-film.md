---
'@inspecto-dev/cli': patch
'@inspecto-dev/core': patch
'@inspecto-dev/plugin': patch
'@inspecto-dev/types': patch
---

Improve inspect mode's `Fix UI` flow by attaching CSS context automatically.

- automatically include captured CSS context for the built-in `fix-ui` intent
- keep the header CSS toggle as an explicit override for non-UI intents
- add regression coverage to preserve the new intent-specific behavior
