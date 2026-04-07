# Screenshot Context Design

## Summary

Add an optional screenshot capability alongside the existing `runtimeContext` flow.

The capability appears in both `inspect` and `annotate` as a dedicated screenshot icon. By default it is off. When the icon is active, the current action attempts to capture a screenshot and includes a structured `screenshotContext` in the request and prompt assembly path. When the icon is off, no screenshot data is collected or sent.

This design intentionally keeps screenshot evidence separate from the existing element information capability. Element metadata remains a foundational context source and is not part of `screenshotContext`.

## Goals

- Match the interaction model of the current `runtime error` toggle: optional, explicit, and easy to understand.
- Support the feature in both `inspect` and `annotate`.
- Improve AI performance for style, layout, and visual debugging requests.
- Keep the screenshot capability non-blocking: failures must degrade gracefully.
- Preserve clean boundaries between `elementContext`, `runtimeContext`, and `screenshotContext`.

## Non-Goals

- No continuous or background capture.
- No full-page screenshot mode in `v1`.
- No multi-image history, visual diffing, or timeline support.
- No automatic hover, focus, expand, or animation-freezing orchestration.
- No migration of element metadata into screenshot payloads.

## User Experience

### Inspect

- Add a screenshot icon in the inspect menu alongside the current runtime error control.
- The icon is off by default.
- When enabled, sending an inspect request attempts one screenshot capture for the current target and includes screenshot evidence in prompt construction.
- When disabled, inspect behaves exactly as it does today.

### Annotate

- Add the same screenshot icon to the annotate flow.
- The icon is off by default.
- When enabled, each annotate send action attempts one screenshot capture for the currently selected target and includes screenshot evidence in the annotate prompt path.
- When disabled, annotate behaves exactly as it does today.

### Toggle Semantics

- The screenshot toggle and runtime error toggle are parallel, independent controls.
- Users may enable neither, either one, or both.
- Toggle state is scoped to the active UI session or panel and is not persisted globally across future sessions.

## Architecture

### Capability Boundaries

- `elementContext`: foundational component and element information, provided independently of screenshots.
- `runtimeContext`: optional runtime evidence, already supported today.
- `screenshotContext`: optional screenshot evidence, introduced by this design.

These three context types may be combined in prompts, but they must remain structurally separate.

### High-Level Flow

1. User activates the screenshot icon.
2. User sends an `inspect` or `annotate` action.
3. The client attempts a single best-effort capture for the current selected element.
4. On success, the client builds a `screenshotContext` object.
5. Prompt builders append a dedicated screenshot evidence section only when `screenshotContext` exists.
6. On failure, the action continues without screenshot evidence.

## Screenshot Capture Strategy

- Capture only on explicit user send.
- Capture only one screenshot per action.
- Scope the image to the current selected component or element with a small padded crop.
- Do not automatically recapture unless the user sends another action.
- Treat the capture as best-effort enhancement, not as a required prerequisite.

`v1` intentionally avoids turning this into a visual automation system. The goal is focused evidence, not fully orchestrated UI-state reproduction.

## Data Model

Add a first-class `screenshotContext` object to the request path, parallel to `runtimeContext`.

Recommended shape:

```ts
type ScreenshotContext = {
  enabled: boolean
  capturedAt: string
  mimeType: string
  imageDataUrl?: string
  imageAssetId?: string
}
```

Notes:

- Omit `screenshotContext` entirely when the screenshot toggle is off.
- Omit `screenshotContext` entirely when capture was attempted but did not produce a usable image in `v1`.
- `enabled` records user intent at send time.
- `capturedAt` helps correlate the screenshot with the current UI state.
- `mimeType` makes the payload explicit.
- `imageDataUrl` is acceptable for a first local implementation.
- `imageAssetId` keeps the contract open for future server-side or asset-based transport.

Element metadata such as selector, label, source location, and bounding rect is intentionally excluded from `screenshotContext`. That data belongs to the separate foundational element information capability.

## Prompt Contract

- Prompt builders must not mention screenshots unless screenshot capture was enabled and succeeded.
- When `screenshotContext` is present, prompt builders append one dedicated screenshot section.
- When it is absent, prompt builders omit the section entirely.
- Screenshot evidence should be framed as visual context, not as authoritative truth.

Example intent of the section:

- inform the model that an image of the current component state is attached
- keep the prompt structure explicit and predictable
- avoid vague phrasing such as “extra screenshot information may be available”

## Failure Handling

- Screenshot failures must never block inspect or annotate sends.
- If capture fails, proceed without `screenshotContext`.
- Failure details may be logged locally for debugging, but should not be appended to the user-facing AI prompt by default.
- If the downstream model or transport path cannot consume image input, the feature should degrade by omitting screenshot evidence rather than inserting placeholder text.

## Compatibility Strategy

- The request and internal prompt-building layers should gain explicit `screenshotContext` support.
- `inspect` and `annotate` should share the same context shape and semantics, even if their prompt assembly happens in different files.
- The contract should support both inline image transport (`imageDataUrl`) and future indirect transport (`imageAssetId`).

## V1 Scope

### Included

- Screenshot icon in both inspect and annotate.
- Independent screenshot toggle behavior parallel to runtime error.
- Single-image capture for the currently selected target.
- Structured `screenshotContext` passed through the request path.
- Conditional screenshot prompt section in both inspect and annotate flows.
- Graceful degradation on capture failure.

### Excluded

- Full-page screenshots.
- Multiple screenshots in one action.
- Automatic interaction-state setup.
- Screenshot persistence across actions.
- Any refactor that folds element information into screenshot capability.

## Success Criteria

- Users can independently toggle screenshot evidence in both inspect and annotate.
- Screenshot-enabled sends include screenshot context only when capture succeeds.
- Screenshot-disabled sends are behaviorally identical to today.
- Runtime error behavior remains unchanged.
- Element information remains a separate foundational capability.
- Failure to capture a screenshot never blocks an AI request.

## Implementation Notes For Planning

- Prefer reusing the current runtime-context toggle mental model in UI naming and placement.
- Prefer a shared screenshot context utility over separate inspect/annotate ad hoc implementations.
- Keep the first implementation narrow enough that it can be tested deterministically.
