# Annotate Record-First Implementation Notes

Date: 2026-04-06
Status: Current

## Purpose

This note records the implementation direction that matches the shipped annotate UX.

## Chosen Model

- one clicked target maps to one `FeedbackRecord`
- the sidebar holds a batch of saved records plus one current draft
- batch-level intent is expressed through the freeform instruction field
- the user sends through one action: `Ask AI`

## Explicit Rejections

The current implementation intentionally does **not** use:

- multi-target current drafts
- grouped selection ids
- separate `Send all` / `Send grouped` actions
- temporary grouped transport assembly in the sidebar flow

## Runtime Mapping

- `packages/core/src/annotate-session.ts`
  Owns current draft and saved-record transitions.
- `packages/core/src/annotate-sidebar.ts`
  Owns the single send action and batch composer UI, including the instruction token/mention segments that back the inline chip experience.
- `packages/core/src/component.ts`
  Owns record creation, batch payload assembly, and evidence attachment.
- `packages/types/src/index.ts`
  Defines `FeedbackRecord`, `FeedbackRecordDraft`, and `FeedbackRecordSession`.

## Expected UX

1. Open the launcher and choose `Annotate`.
2. Confirm the header status reads `Capturing clicks`.
3. If no records exist yet, read the empty-state cue: `Start by clicking a component`.
4. Click a component.
5. Edit the record note and intent.
6. Save it with `Save note`.
7. Repeat across other components.
8. Optionally add a batch instruction.
9. Click `Ask AI`.

Supporting UX terms:

- launcher states: `Ready`, `Inspect mode`, `Annotate mode`, `Selection paused`
- launcher panel: `Choose a mode` with `Inspect` / `Annotate` as primary choices
- launcher utility: `Pause selection` / `Resume selection` lives below the mode choices
- annotate control: `Pause selection` / `Resume selection`
- annotate accelerator: `Quick capture`

## Verification

The minimum verification set for this design is:

- `pnpm --filter @inspecto-dev/core test -- annotate-session.test.ts annotate-sidebar.test.ts annotate-mode.test.ts`
- `pnpm --filter @inspecto-dev/types build`

## Follow-up Constraint

Any future annotate enhancement should preserve the single-send UX unless there is a strong, user-proven reason to introduce another send path.

The batch instruction field also has a second constraint:

- keep the current single-field UI with inline component references
- do not split it into a detached text area plus a separate chip-only list
- evolve it through internal token/mention segments instead of relying on raw DOM structure as the source of truth

## Evidence Matrix

Annotate evidence is intentionally asymmetric:

- sidebar: session-level `bug` / runtime toggle
- composer: record-level `css` toggle
- screenshot: hidden for now

These entry points are built-in runtime capabilities, not settings or prompt-schema fields. Future work should preserve that boundary unless there is a concrete product reason to expose configuration.
