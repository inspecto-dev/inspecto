# Fix Bug Runtime Context Design

## Summary

This design upgrades inspect mode's built-in `fix-bug` prompt from a source-only handoff into an evidence-guided debugging request. The system should automatically attach high-confidence runtime context from the current page, filter out noise aggressively, and instruct the AI to separate confirmed findings from hypotheses before proposing a minimal fix.

The primary goal is to improve first-pass fix quality and reduce false conclusions. Token cost matters, but only after relevance and correctness.

## Problem

The current inspect flow sends only:

- target source location
- an optional source snippet
- a static prompt template

That is not enough for many real bugs. Frontend failures often depend on runtime evidence such as:

- uncaught exceptions
- rejected promises
- failed requests
- error logs emitted during a user interaction

Without that evidence, the AI is forced to infer root causes from source alone, which reduces fix accuracy and increases the chance of confident but incorrect suggestions.

## Goals

- Improve the probability that `fix-bug` can produce a useful first-pass fix without needing follow-up.
- Reduce misleading context by sending only runtime records with strong evidence of relevance.
- Keep the inspect interaction fast: one click should still dispatch immediately by default.
- Make the prompt shape stable so AI outputs are more predictable.
- Allow the user to see what context is being attached without forcing manual curation on every send.

## Non-Goals

- Full browser DevTools replication inside Inspecto.
- Capturing every console record or every network request.
- Automatic code modification in the browser runtime flow.
- Precise causal tracing across all framework abstractions.
- Shipping screenshot or DOM snapshot support in the first version.

## Current State

Today, `fix-bug` is a static intent template. Inspect mode builds a prompt from the selected source location and optional snippet, then dispatches it to the IDE AI target. The payload does not include any runtime logs, request failures, or structured debugging evidence.

This design keeps the same dispatch path and extends the context assembly stage before prompt delivery.

## Recommended Approach

Use structured runtime context enhancement.

At dispatch time, Inspecto should assemble a prompt from:

1. target source context
2. high-confidence runtime evidence
3. a fixed response contract for the AI

Raw logs should not be appended directly. All runtime context must first be normalized, deduplicated, ranked, and compressed into evidence blocks.

## Runtime Evidence Sources

The first version should collect only high-signal sources:

- `window.error`
- `unhandledrejection`
- `console.error`
- failed `fetch` and `XMLHttpRequest` activity

Failed request activity includes:

- network failures
- HTTP `4xx` and `5xx`
- response parse failures

The first version should not attach by default:

- `console.log`
- most `console.warn`
- HMR messages
- websocket reconnect noise
- sourcemap failures
- browser extension errors
- analytics and telemetry requests
- third-party SDK noise unless directly implicated in the target failure

## Evidence Model

Each captured record should be normalized into a compact internal shape.

Suggested fields:

- `id`
- `kind`: `runtime-error` | `promise-rejection` | `console-error` | `failed-request`
- `timestamp`
- `message`
- `stack`
- `sourceUrl`
- `sourceFile`
- `componentHints`
- `request.method`
- `request.url`
- `request.pathname`
- `request.status`
- `request.responseSummary`
- `occurrenceCount`
- `route`
- `interactionId`

The browser runtime should keep a short-lived in-memory buffer. Persistence is not required.

### Current v1 Capture Clarification

The current implementation keeps runtime capture attached whenever inspect mode is available and not paused, even if the inspector overlay is not actively open.

This preserves recent evidence for hotkey-driven inspect flows, where the user may hold the inspect hotkey only at the moment they click a target.

## Buffering Strategy

Use two overlapping windows:

### Global Runtime Buffer

Purpose:
collect candidate records from the current page.

Defaults:

- retain the last 60 seconds
- deduplicate repeated records
- increment counts for repeated errors

### Interaction-Scoped Buffer

Purpose:
highlight evidence close to the user's likely bug-triggering action.

Defaults:

- focus on the last 10 to 15 seconds around the latest meaningful interaction
- meaningful interactions include clicking an inspected element, actions immediately preceding `Fix Bug`, and user actions that trigger relevant errors or requests

These two windows allow the system to capture both:

- errors that happen immediately after the inspect action
- errors that happened just before inspect, but are still likely part of the same bug

## Relevance Ranking

Prompt quality depends more on relevance ranking than on raw collection breadth.

Each runtime record should receive a `relevanceScore` and a `relevanceLevel`.

### Ranking Signals

- temporal proximity to `Fix Bug`
- temporal proximity to the latest meaningful interaction
- same route or same document context
- stack references to the inspected file
- stack references to nearby project files
- component, hook, or function names that match the inspected area
- request timing that aligns with the inspected interaction
- request pathname that maps to data used by the target UI
- repeated occurrence count
- severity weighting

### Severity Weighting

Recommended order:

- runtime error
- unhandled rejection
- failed request
- console error

### Relevance Levels

- `high`: included by default
- `medium`: included only when high-confidence evidence is sparse
- `low`: excluded from the default prompt

This must remain rule-based and explainable in v1. A transparent heuristic is more maintainable than an opaque scoring model.

## Noise Filtering

Before ranking or prompt assembly, records should be filtered through a denylist and normalization layer.

Default exclusions should cover:

- HMR and dev server websocket chatter
- known extension script URLs
- sourcemap fetch failures
- asset 404s unrelated to the target UI
- analytics and beacon endpoints
- cross-origin noise with no route or target relationship

The system should prefer dropping uncertain records over polluting the prompt with weak signals.

### Current v1 Filtering Clarification

The current denylist implementation filters obvious development noise first:

- `[vite]` messages
- `hmr` and `hot update` chatter
- websocket reconnect noise
- sourcemap failures
- `extension://` browser extension noise

Analytics, beacon, and broader third-party endpoint filtering are not yet implemented in the current v1 heuristic and should be treated as future tuning work rather than a guaranteed exclusion.

## Prompt Assembly

The `fix-bug` prompt should be rebuilt around a stable five-part structure.

### 1. Task Framing

State that this is a bug-fix request for the currently inspected UI target, not a general review.

### 2. Target Source Context

Include:

- file path
- line and column
- framework
- inferred component or element name when available
- optional snippet

### 3. High-Confidence Runtime Evidence

Add only compressed evidence blocks. Each block should include:

- record type
- concise message
- timing
- repeat count
- relevance explanation
- truncated stack or request summary

### 4. Guardrails

Explicitly instruct the AI to:

- prioritize evidence-backed conclusions
- separate confirmed findings from hypotheses
- avoid strong claims based on weakly related logs
- ask follow-up questions if the evidence is insufficient

### 5. Response Contract

Require a fixed answer shape:

- most likely root cause
- confirmed evidence
- hypotheses
- minimal fix
- follow-up questions if needed

## Prompt Budget

The system should enforce a strict context budget.

Recommended defaults:

- up to 3 runtime evidence blocks
- up to 2 failed request blocks
- stack traces limited to the top 5 to 8 meaningful lines
- short response summaries only

Truncation priority should preserve:

1. target source context
2. high-confidence runtime evidence
3. medium-confidence evidence if budget allows

Low-confidence evidence should never displace high-confidence evidence or the snippet.

## AI Behavior Rules

The prompt must make the expected reasoning behavior explicit.

The AI should:

- propose a direct fix when evidence and code context are sufficient
- use confirmed evidence to justify the primary root cause
- isolate uncertainty into a hypothesis section
- ask at most 3 necessary follow-up questions when key information is missing

The AI should not:

- treat unrelated logs as proof
- broaden the task into a broader redesign or unrelated cleanup
- speculate confidently when the evidence is weak

## Send-Time User Experience

The default interaction should remain one click.

Recommended behavior:

- `Fix Bug` remains a primary action
- the UI shows a compact summary such as `2 errors · 1 failed request`
- the user can expand a preview to inspect what will be attached
- a lightweight toggle allows disabling runtime context for this send

The user should not be required to approve each evidence block individually. Relevance curation is the system's responsibility.

### Current v1 Preview Clarification

In the current implementation, runtime evidence is a built-in inspect capability rather than a user settings field. The preview UI is shown when inspect runtime context is enabled for the current menu session and selected runtime context exists.

The preview toggle is an expand/collapse control for inspecting attached evidence. It does not disable runtime context for a single send in v1.

## Fallback Behavior

When the system finds no `high` evidence:

- send the prompt with source context only
- explicitly state that reliable runtime evidence is unavailable
- instruct the AI not to make strong causal claims without qualification

When only `medium` evidence exists:

- include a very small amount of medium evidence
- mark it as suggestive, not confirmed

## Rollout Plan

Deliver this incrementally:

### Phase 1

- capture runtime errors, promise rejections, console errors, and failed requests
- keep short in-memory buffers
- rank and compress evidence
- inject evidence into `fix-bug`

### Phase 2

- improve target matching with stronger component and file hints
- tune denylists and request relevance heuristics
- refine preview UI

### Phase 3

- consider optional richer signals such as framework-specific error hooks, DOM state, or screenshot support

## Risks

### Noise Risk

Even filtered runtime context can include unrelated records. The mitigation is aggressive exclusion, conservative ranking, and low default limits.

### Token Risk

Long stacks and request payloads can quickly dominate the prompt. The mitigation is strict compression and priority-based truncation.

### False Confidence Risk

More context can make poor conclusions sound more convincing. The mitigation is the response contract that forces confirmed evidence and hypotheses into separate sections.

### Instrumentation Risk

Patching console or request APIs can cause side effects if done carelessly. The implementation should preserve native behavior and keep the capture layer minimal.

## Open Decisions

- whether `console.warn` should have an opt-in path for framework ecosystems where warnings are operationally significant
- whether request relevance should use a configurable denylist

## Recommendation

Implement the conservative version first:

- automatic runtime context capture
- high-confidence evidence only by default
- stable prompt contract
- one-click send with optional preview

This version best matches the product goal: help the AI fix more bugs correctly on the first pass without drowning it in logs.
