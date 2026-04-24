# Astro Playground

This playground verifies Inspecto's Astro-specific integration path.

## Setup Instructions

This playground uses `@inspecto-dev/plugin/astro` from `astro.config.mjs`. The integration
registers Inspecto's Vite transform internally and injects the browser runtime through Astro's
page script pipeline during development.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start development server

```bash
pnpm run dev
```

### 3. Try Inspecto

Open the app, hold the Inspecto hotkey, and click any rendered Astro element to verify that the
playground resolves source context correctly.
