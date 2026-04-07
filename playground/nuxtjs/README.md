# Nuxt.js Playground

This is a Nuxt.js playground with Inspecto already wired in.

## Setup Instructions

This playground already registers the Inspecto Vite plugin in `nuxt.config.ts` and mounts `@inspecto-dev/core` from `plugins/inspecto.client.ts` during development.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start development server

```bash
pnpm run dev
```

### 3. Try Inspecto

Open the app, hold the Inspecto hotkey, and click any rendered element to verify the Nuxt playground is dispatching source context correctly.
