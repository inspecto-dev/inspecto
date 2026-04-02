# Phase 8: Playgrounds & Demonstrations

This document serves as an overview of the implementation and purpose of the playground environments within the `inspecto` monorepo.

## Overview

We have built four distinct playground environments to thoroughly verify the behavior of `inspecto` across different modern frontend build tools and frameworks. These playgrounds not only serve as a testbed for the unplugin's AST transformation and the core Web Component UI, but they also function as interactive demo sites detailing the tool's core features.

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

## Shared UI Architecture

To present a professional and unified experience, all four playgrounds share a consistent UI layout (originally styled via `common-styles.css`). This layout includes:

- **Introductory Section**: Outlines the core features (Zero Config, Deep IDE Integration, Framework Agnostic Overlay, etc.).
- **Instruction Banner**: Clear directions on how to trigger the inspector (`Option/Alt + Hover`).
- **Test Cases / Features Showcase**: Dedicated UI cards that act as inspection targets:
  - _Stateful Components_: Verifies that the AI assistant receives the full code context including hooks/refs.
  - _Stateless Components_: Validates straightforward AST parsing.
  - _Architectural Showcases_: Elements with heavy inline styling to prove the immunity of the Shadow DOM overlay against CSS bleeding.

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

| Behavior                               | react-vite | vue-vite | nextjs (App Router) | react-rspack |
| :------------------------------------- | :--------- | :------- | :------------------ | :----------- |
| `data-inspecto` injected in dev        | ✓          | ✓        | ✓                   | ✓            |
| `data-inspecto` absent in prod build   | ✓          | ✓        | ✓                   | ✓            |
| Overlay appears on Alt+hover           | ✓          | ✓        | ✓                   | ✓            |
| Component state included in context    | ✓          | ✓        | ✓                   | ✓            |
| Handles framework-specific escape tags | ✓          | ✓        | ✓                   | ✓            |
