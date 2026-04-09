# Compatibility Checklist

Use this checklist to validate Inspecto after changes to launcher UX, inspect mode, annotate mode, or IDE routing.

## Target Matrix

### Supported Bundlers & Frameworks

- Vite (React, Vue)
- Webpack 5 (React, Vue)
- Webpack 4 (React, Vue) - Supported via legacy plugin
- Rspack / Rsbuild (React, Vue)
- Next.js (Webpack-based, experimental)
- Nuxt.js (Vite-based)

### macOS

- VS Code
- Cursor
- Trae / Trae CN (if supported)
- Chrome
- Safari

### Windows

- VS Code
- Cursor
- Chrome
- Edge

### Linux

- VS Code
- Chrome
- A desktop environment with `xdg-open`

## Core Flows

Run these checks for each platform + IDE pair.

### 1. Quick jump

- Open the app in the browser.
- Trigger `Alt + Click` on an inspectable element.
- Confirm the editor opens the correct file.
- Confirm the cursor lands on the correct line and column.

### 2. Inspect mode

- Open the launcher and choose `Inspect mode`.
- Click a component to open the inspect menu.
- Confirm `Open in Editor` opens the correct source location.
- Confirm built-in actions render correctly: `Explain`, `Fix Bug`, `Fix UI`, `Improve`.

### 3. Inspect runtime / css affordances

- In inspect mode, toggle `bug` and `css`.
- Confirm the active state is visible.
- Confirm runtime summary text remains readable.
- Confirm no screenshot icon is shown in the current release.

### 4. Annotate composer

- Open the launcher and choose `Annotate mode`.
- Click a component to open the composer.
- Type into the composer note field.
- Confirm the launcher eyes avert while typing.
- Save the note and confirm the overlay pin remains correct.

### 5. Annotate sidebar

- In annotate mode, type into the sidebar instruction field.
- Confirm the launcher eyes avert while typing.
- Confirm `Ask AI` remains the only send action.
- Confirm `Quick capture`, `Pause selection`, and `Resume selection` work as expected.

### 6. Raw prompt preview

- In annotate mode, click the `</>` preview button.
- Confirm the raw prompt preview becomes visible.
- Confirm it is not clipped by the sidebar container.
- Confirm it repositions correctly above or below the footer when space is tight.

## Path Cases

Run at least one open-file check for each path category below.

- Standard absolute path:
  - `/repo/src/App.tsx`
  - `C:\\repo\\src\\App.tsx`
- Monorepo package path:
  - `/repo/packages/web/src/App.tsx`
- Path containing spaces:
  - `/Users/foo/My Project/src/App.tsx`
  - `C:\\Users\\foo\\My Project\\src\\App.tsx`
- Symlinked or linked workspace path if your setup uses them

## Things To Watch

- The correct IDE opens when multiple IDEs are installed.
- File opens are not routed to the wrong editor.
- Windows paths are not duplicated or malformed.
- Line and column are respected, not just the file path.
- Safari focus behavior does not break inspect / annotate state.
- Shadow DOM focus changes still update launcher eye behavior.
- Linux `xdg-open` environments still open supported IDEs correctly.

## Exit Criteria

Inspecto is compatible for a target environment when:

- `Quick jump` works
- inspect mode works
- annotate mode works
- open-file routing is correct
- launcher state feedback is correct
- raw prompt preview is visible and unclipped
