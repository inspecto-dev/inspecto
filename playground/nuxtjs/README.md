# Nuxt.js Playground

This is a test playground for Inspecto with Nuxt.js.

## Setup Instructions

Since this playground is meant to test the `npx @inspecto-dev/cli init` command, it is an empty Nuxt.js template.

### 1. Install dependencies

```bash
pnpm install nuxt vue --save-dev
```

### 2. Test Inspecto CLI

Run the local CLI to test the initialization process:

```bash
cd playground/nuxtjs
node ../../packages/cli/dist/bin.cjs init
```

### 3. Start development server

```bash
pnpm run dev
```
