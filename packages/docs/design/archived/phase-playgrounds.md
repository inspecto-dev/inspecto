# Phase 8: Playgrounds & Demonstrations

This document serves as an overview of the implementation and purpose of the playground environments within the `inspecto` monorepo.

## Overview

We have built several playground environments to verify `inspecto` across modern frontend build tools and frameworks. These playgrounds are not just AST smoke tests; they act as hands-on verification surfaces for the browser UX as it exists today:

- launcher-driven mode selection
- `Inspect`
- `Annotate`
- `Alt + Click` quick jump
- runtime evidence
- CSS evidence

### Playgrounds Included:

1.  **`playground/react-vite`**
    - **Framework**: React 18
    - **Bundler**: Vite
    - **Purpose**: The baseline testing environment. Verifies the core Vite plugin integration, standard JSX AST transformation, and React component state inspection.

2.  **`playground/react-rspack`**
    - **Framework**: React 18
    - **Bundler**: Rspack (via Rsbuild)
    - **Purpose**: Verifies compatibility with SWC-based and Webpack-compatible build systems. Ensures that the `rspackPlugin` export correctly hooks into Rsbuild without throwing module resolution or AST transform sequence errors.

3.  **`playground/nextjs`**
    - **Framework**: Next.js (App Router)
    - **Bundler**: Webpack (Next.js internal)
    - **Purpose**: The most complex environment. Verifies the Webpack plugin integration. Critically, it demonstrates compatibility with **React Server Components (RSC)**, ensuring that attributes are successfully injected into both RSC and Client (`'use client'`) boundaries without breaking Next.js's internal SSR/hydration mechanisms or `next/dynamic` lazy loading.

4.  **`playground/vue-vite`**
    - **Framework**: Vue 3
    - **Bundler**: Vite
    - **Purpose**: Validates the `@vue/compiler-dom` AST parsing capabilities. Ensures that Single File Components (`.vue`) are correctly transformed, maintaining accurate source file, line, and column data.

## Shared Demo Goals

The primary playgrounds should present a professional verification surface rather than generic sample cards. The page content should make it obvious how to test the current product:

- **Mode checks**: Dedicated targets for `Inspect`, `Annotate`, and `Alt + Click` quick jump.
- **Runtime evidence**: At least one intentional runtime error trigger to validate the bug icon flow.
- **CSS evidence**: At least one visually rich component to validate CSS-context attachment.
- **Batch annotation**: At least two or three unrelated components that are suitable for multi-note annotate sessions.
- **Stable mapping anchor**: A simple card whose only job is to confirm exact file / line / column mapping.

The copy should stay product-facing and accurate:

- avoid outdated “hover to inspect” language
- avoid suggesting that `Alt + Click` is the only main workflow
- reflect the current launcher + `Inspect` + `Annotate` model

## Usage

You can start any of the playgrounds by navigating to their directory and running the dev script:

```bash
# Example: Next.js App Router
cd playground/nextjs
pnpm dev

# Example: React + Vite
cd playground/react-vite
pnpm dev
```

## Cross-Framework Verification Matrix

The playgrounds have successfully verified the following cross-environment behaviors:

| Behavior                              | react-vite | vue-vite | nextjs (App Router) | react-rspack |
| :------------------------------------ | :--------- | :------- | :------------------ | :----------- |
| `data-inspecto` injected in dev       | ✓          | ✓        | ✓                   | ✓            |
| `data-inspecto` absent in prod build  | ✓          | ✓        | ✓                   | ✓            |
| Launcher + mode selection available   | ✓          | ✓        | ✓                   | ✓            |
| `Inspect` flow verifiable             | ✓          | ✓        | ✓                   | ✓            |
| `Annotate` flow verifiable            | ✓          | ✓        | ✓                   | ✓            |
| Quick jump (`Alt + Click`) verifiable | ✓          | ✓        | ✓                   | ✓            |
| Runtime evidence case included        | ✓          | ✓        | partial             | partial      |
| CSS evidence case included            | ✓          | ✓        | partial             | partial      |
| Component state included in context   | ✓          | ✓        | ✓                   | ✓            |
