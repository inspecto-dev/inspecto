# Annotate Mode Design

Date: 2026-04-06
Status: Current

## Summary

Inspecto keeps `Inspect mode` for single-target immediate actions and uses `Annotate mode` for batch feedback capture.

`Annotate mode` is record-first:

- one clicked component creates or reopens one `FeedbackRecord`
- the sidebar collects many saved records
- the freeform instruction field provides optional batch-level intent
- the user sends everything through one action: `Ask AI`

This keeps annotate aligned with the current UI while avoiding a second send path.

## Goals

- Keep annotate easy to learn for first-time users.
- Support fast batch capture across many unrelated components.
- Support related-component review through one optional batch instruction.
- Preserve the speed of single-target editing and source-linked overlays.

## Non-Goals

- Multi-target editing inside one draft record
- Separate `Send all` / `Send grouped` actions
- Selection-driven send branches
- Persistent multi-page sessions
- In-sidebar AI response rendering

## Product Principles

1. `Inspect mode` and `Annotate mode` must have different click behavior.
2. `Inspect mode` is for immediate single-target actions.
3. `Annotate mode` is for collecting many target-level notes into one AI batch.
4. The smallest editable unit in annotate is one target-specific record.
5. Relationship between records is expressed by the batch instruction, not by a second send mode.
6. The send surface must stay singular: `Ask AI`.

## Mode Boundaries

### Launcher Entry

The bottom-right launcher should explain the click outcome before the user enters a mode.

The launcher should behave like a mode selector, not a generic tool menu.

Recommended launcher entries:

- `Inspect`
  `Click one component to inspect or ask AI`
- `Annotate`
  `Capture notes across components, then Ask AI once`

Recommended launcher panel structure:

- title: `Choose a mode`
- subtitle: `Your next page click will follow this mode.`
- primary group: `Inspect`, `Annotate`
- utility group: `Pause selection` / `Resume selection`

Launcher state labels should remain user-facing:

- `Ready`
- `Inspect mode`
- `Annotate mode`
- `Selection paused`

### Inspect Mode

- User clicks an inspectable element.
- Inspecto opens the inspect menu.
- Built-in and AI actions apply to that one target.

Inspect evidence entry points follow a fixed built-in model:

- `bug` / runtime is available in the inspect header when runtime evidence is supported
- `css` is available in the inspect header when CSS capture is supported
- `screenshot` is hidden in the current UI

Inspect runtime states:

- `inactive`: runtime evidence will not be attached unless the user enables it
- `active`: runtime evidence will be attached for all inspect sends in the current menu session
- `mixed`: runtime evidence defaults to fix actions only until the user overrides it

`mixed` is a product-facing state. It should never expose internal ids such as `fix-bug`.

### Annotate Mode

- User clicks an inspectable element.
- Inspecto opens or restores one record composer for that target.
- No inspect menu appears on click.
- The sidebar remains the main place to review the batch and send it.

These two modes should never map the same click to two different outcomes.

## Information Architecture

`Annotate mode` uses a right sidebar with three visible areas.

### 1. Header

- `Pause selection` / `Resume selection`
- runtime evidence toggle when available
- `Exit annotate mode`

The annotate header should also expose the current capture state in plain language:

- `Capturing clicks`
- `Capturing clicks • Quick capture on`
- `Selection paused`
- `Selection paused • Quick capture on`

`Quick capture` is an annotate acceleration toggle, not a separate mode.

### 2. Batch Composer

- one freeform instruction field
- inline chips representing saved records and the current draft
- optional raw payload preview

When the batch is empty, annotate should show a lightweight empty state before the composer body:

- `Start by clicking a component`
- `Each click opens one note. Save a few notes first, then add an overall goal and Ask AI once.`

This keeps the first action unambiguous and prevents the empty sidebar from feeling like a blank form.

The instruction field is batch-level context. It can describe:

- a shared intent across records
- a review lens such as accessibility or spacing
- a coordinating request such as "prioritize the risky issues first"

Users must be able to freely mix plain text with component references in the same field.

Examples:

- `Compare @HeaderCard and @ActionBar hierarchy, then suggest one fix.`
- `Review @Button.primary for spacing, but prioritize the broader form rhythm.`

### 3. Records Stream

Each saved record represents one annotated component.

Each item should expose:

- target label
- note summary
- reopen/edit action
- delete action

### Footer

- one primary action: `Ask AI`

## Core Workflow

1. User enters `Annotate mode`.
2. If the batch is empty, Inspecto shows the `Start by clicking a component` empty state.
3. User clicks a component.
4. Inspecto opens the composer for that target.
5. User writes a note and selects an intent for that record.
6. User clicks `Save note`.
7. The record is saved into the batch stream.
8. User repeats this across any number of components.
9. User optionally writes or edits the batch instruction.
10. User clicks `Ask AI`.
11. Inspecto sends the current draft, if any, plus all saved records in one batch request.

## User Scenarios

### Unrelated Batch Markup

- User marks several unrelated components.
- Each record keeps its own note and intent.
- Batch instruction can stay empty.
- `Ask AI` sends all records as one batch.

### Related Batch Review

- User marks several components that participate in one broader issue.
- Each record still keeps its local note.
- User adds a batch instruction describing the shared intent.
- `Ask AI` sends the same record list, now with stronger batch-level guidance.

The UI does not branch between these scenarios. Only the instruction changes.

## Flow Summary

The ideal end-to-end flow is:

1. Open the launcher.
2. Choose `Inspect` for one component or `Annotate` for a batch workflow.
3. In annotate, rely on the header status text to know whether clicks are currently being captured.
4. Use `Pause selection` only as a secondary utility when normal page interaction is needed.
5. Use `Quick capture` only to speed up note collection inside annotate.
6. Finish with one `Ask AI`.

## Data Model

```ts
type AiIntent = 'ask' | 'fix' | 'review' | 'redesign'

type AnnotationIntent = AiIntent

interface FeedbackRecord {
  id: string
  displayOrder: number
  target: AnnotationTarget
  note: string
  intent: AnnotationIntent
  cssContextEnabled?: boolean
}

interface FeedbackRecordDraft {
  id: string
  displayOrder?: number
  target: AnnotationTarget | null
  note: string
  intent: AnnotationIntent
  cssContextEnabled?: boolean
}

interface FeedbackRecordSession {
  current: FeedbackRecordDraft
  records: FeedbackRecord[]
}
```

This is intentionally record-first. Batch-level meaning is carried by the outgoing instruction string, not by nested record groups.

## Instruction Composer Constraint

The batch instruction keeps the current single-field UI. It must not be split into a separate textarea plus a detached chip list.

Implementation constraint:

- the visible UI remains one freeform composer with inline component references
- component references should be modeled internally as token/mention segments
- prompt assembly should serialize from those segments, not from ad hoc DOM traversal alone

Recommended internal shape:

```ts
type InstructionSegment = { type: 'text'; text: string } | { type: 'chip'; id: string }
```

This preserves the current UX while making future mention behavior safer and more extensible.

## Transport Design

The batch protocol stays simple:

```ts
interface SendAnnotationsToAiRequest {
  instruction?: string
  annotations: AnnotationTransport[]
  responseMode?: 'unified' | 'per-annotation'
  runtimeContext?: RuntimeContextEnvelope
  cssContextPrompt?: string
}
```

Recommended defaults:

- send one `AnnotationTransport` per saved record
- include the current draft if it is complete enough to send
- keep `responseMode = 'unified'`
- keep screenshot transport out of the current annotate surface until screenshot UX is reintroduced

## Evidence Strategy

Annotate evidence should use a fixed scope model:

- `runtime` / `bug` is batch-scoped
- `css` is record-scoped
- `screenshot` is hidden in the current annotate UI

Current placement rules:

- annotate sidebar header exposes runtime only
- annotate composer exposes CSS only
- annotate does not expose screenshot entry points in v1

Supporting rules:

- `bug` and `css` are built-in entry points, not user-configurable schema items
- entry visibility is controlled by runtime capability checks
- attachment is controlled by the current session toggle state

Cross-mode evidence matrix:

- inspect header: `bug` + `css`
- annotate sidebar: `bug`
- annotate composer: `css`
- screenshot: hidden in the current UI

Details:

- runtime context is collected across the outgoing batch and sent once with `Ask AI`
- CSS context follows the current record and is attached per annotated component
- screenshot context remains intentionally hidden until cross-assistant handling is ready

## packages/core Boundaries

At the runtime level:

- `component.ts` owns mode routing, batch send, and record/draft lifecycle
- `annotate-session.ts` owns record-first session transitions
- `annotate-sidebar.ts` owns the batch composer and records stream
- `annotate-overlay.ts` owns current/saved target overlays

Current annotate semantics should remain:

- click target -> open or restore one record draft
- save draft -> append one record
- `Ask AI` -> send all included records through one batch request

## Decision

Proceed with `Annotate mode` as a record-first batch workflow.

Do not reintroduce:

- multi-target current drafts
- grouped selection state
- multiple send buttons
- separate grouped transport composition in the UI layer

If a richer relation model is needed later, it should be added on top of this flow without breaking the single `Ask AI` path.
