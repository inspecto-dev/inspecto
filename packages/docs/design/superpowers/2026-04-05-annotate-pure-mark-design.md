# Annotate Pure Mark Mode Design

## Summary

Add a session-scoped `Pure Mark` toggle to annotate mode.

When the toggle is off, annotate behaves exactly as it does today: clicking a target creates a current draft and opens the nearby composer, and the record is only saved after the user clicks `Add`.

When the toggle is on, clicking a standard element immediately creates a saved annotation record with an empty note, updates the overlay pin and sidebar chip, and does not open the composer. Users can still click an existing pin or sidebar chip later to open the current editor flow and add a note or adjust per-record options.

This design optimizes the common “rapidly mark several relevant elements first, refine later if needed” workflow without introducing a second editing system.

## Goals

- Reduce friction for annotate sessions where users only need to mark relevant elements.
- Keep the existing composer-based editing flow available for later refinement.
- Scope the feature to annotate sessions so it is easy to discover and easy to leave.
- Reuse current overlay, sidebar, and session concepts rather than introducing a parallel state model.
- Preserve current annotate behavior completely when the toggle is disabled.

## Non-Goals

- No redesign of annotate into a sidebar-only editor.
- No global persisted setting in `v1`; the toggle is session-scoped only.
- No change to inspect mode.
- No automatic note generation or implicit AI behavior when a mark is created.
- No duplicate-record strategy for repeated clicks on the same target.

## User Experience

### Default Annotate Mode

- The new `Pure Mark` control appears in the annotate sidebar header with the other session controls.
- It is off by default.
- With the toggle off, annotate mode behaves exactly as it does today.

### Pure Mark Mode

- When `Pure Mark` is on, clicking a standard element immediately creates a saved annotation record.
- The overlay shows the new saved pin and the sidebar shows the new chip.
- No composer appears for newly marked elements.
- The user can continue clicking more elements without interruption.

### Editing After Marking

- Clicking an existing saved pin in the overlay still enters the current edit flow.
- Clicking a sidebar chip for an existing saved record still enters the current edit flow.
- Once editing starts, the existing composer behavior remains unchanged: note editing, delete, CSS toggle, runtime toggle, screenshot toggle, and save/cancel actions all continue to work as they do today.

### Repeated Clicks On The Same Target

- If the user clicks a target that already has a saved record, annotate should enter the existing edit flow for that record instead of creating a duplicate.
- This keeps pin numbering stable, avoids visual clutter, and matches the current “edit existing record” mental model.

## Architecture

### Responsibility Boundaries

- `component.ts`: owns annotate-mode interaction flow, mode-specific state, and orchestration between session, overlay, and sidebar.
- `annotate-sidebar.ts`: renders the session-level `Pure Mark` toggle and exposes the callback for changing it.
- `annotate-overlay.ts`: continues to render pins and only renders the composer when `composerOptions` are provided.
- `annotate-session.ts`: remains the source of truth for current record vs saved records.

The feature should be implemented by changing the annotate click flow in `component.ts`, not by teaching the overlay to hide an otherwise unchanged draft.

### State Model

- Add a session-scoped boolean state in the annotate controller, parallel to other annotate UI state such as capture pause and context toggles.
- The toggle state is not stored in schema settings or persisted across future annotate sessions in `v1`.
- Saved records created through `Pure Mark` use the same data shape as normal saved records; the only difference is how they are created.

### Why Immediate Save Is Required

Current annotate draft persistence intentionally drops drafts that have no note and no meaningful per-record changes. That behavior is correct for the current composer-first flow, but it makes a “hide the composer only” approach unsafe because consecutive clicks would lose earlier empty marks.

Therefore `Pure Mark` must follow a click-to-save path rather than a click-to-draft path.

## Interaction Flow

### Toggle Off

1. User clicks a target in annotate mode.
2. The controller creates or restores a current draft.
3. Overlay renders current selection and composer.
4. User clicks `Add` to save.

This flow is unchanged.

### Toggle On

1. User clicks a target in annotate mode.
2. If the target already exists as a saved record, the controller enters edit mode for that record.
3. Otherwise the controller immediately creates a saved record with an empty note.
4. Overlay rerenders pins without showing a composer for that new mark.
5. Sidebar rerenders chips and prompt preview.

### Optional Later Editing

1. User clicks a saved pin or chip.
2. The controller begins editing that record.
3. Overlay renders the composer using the existing edit flow.
4. User saves, cancels, or deletes using unchanged behavior.

## Data and Prompt Semantics

- Empty-note records created via `Pure Mark` are still valid annotations.
- They remain selectable in the annotate session like any other record.
- Sending annotate output must continue to include these records, using target metadata even when note text is empty.
- Existing prompt assembly should continue to treat note text as optional for annotate records.

`v1` should not invent placeholder note text such as “Marked element” unless the current prompt contract already requires it. The preferred design is to preserve empty notes and rely on the target metadata plus session instruction.

## Failure Handling

- Toggling `Pure Mark` on or off must never discard existing saved records.
- If record creation fails unexpectedly, annotate should fail gracefully and avoid leaving the overlay/sidebar out of sync.
- Switching from `Pure Mark` back to normal mode should only affect future clicks; it should not rewrite or normalize already created empty-note records.

## Testing Strategy

### Annotate Mode Tests

- Verify that enabling `Pure Mark` and clicking a target does not open the composer.
- Verify that the click immediately creates a saved pin and sidebar chip.
- Verify that clicking several different targets accumulates multiple saved records.
- Verify that clicking an already saved target enters edit mode instead of creating a duplicate.
- Verify that saved records created in `Pure Mark` are still included in annotate send behavior.

### Sidebar Tests

- Verify that the new toggle renders in the annotate sidebar.
- Verify that its visual and accessibility state updates correctly when toggled.
- Verify that toggling the control does not disturb unrelated annotate session state.

### Overlay Tests

- Verify that the pure-mark path uses overlay rendering without composer for newly created marks.
- Verify that composer still appears when the user explicitly edits an existing saved record.

## V1 Scope

### Included

- Session-level `Pure Mark` toggle in annotate sidebar.
- Click-to-save behavior for newly marked elements when the toggle is enabled.
- Reuse of the existing composer when editing previously marked records.
- Test coverage for the new click flow, toggle behavior, and no-composer rendering path.

### Excluded

- Persisted user preference in settings schema.
- Sidebar-based note editor.
- Any changes to inspect mode or prompt response mode.
- Bulk edit workflows for empty-note marks.

## Success Criteria

- Users can rapidly mark multiple elements without clicking `Add` for each one.
- Default annotate behavior remains unchanged when `Pure Mark` is disabled.
- Newly marked elements appear immediately as saved pins and chips when the toggle is enabled.
- Existing records remain editable through the current composer flow.
- Repeated clicks on the same marked target do not create duplicate records.
- Empty-note marks remain valid through annotate send.

## Implementation Notes For Planning

- Prefer adding a dedicated annotate controller branch for `Pure Mark` instead of overloading `persistCurrentDraft()`.
- Prefer a focused helper for “create or edit mark from click” semantics so the normal annotate path stays readable.
- Reuse the overlay’s existing “no composer when no `composerOptions` are passed” capability.
- Keep the first implementation narrow and session-scoped to avoid widening the change into schema, plugin config, or persistence concerns.
