# MCP Minimal Annotation Loop

Date: 2026-05-02
Status: Proposed

## Summary

Inspecto should add MCP support, but the first version should not aim to expose every browser capability.

The near-term goal is narrower:

- turn annotate submissions into durable session objects
- let agents watch pending work
- let agents reply to developers
- let agents resolve a session when work is complete

This gives Inspecto a real hands-free agent loop for annotate workflows.

## Why Now

Inspecto already has three strong pieces:

- browser-side selection and annotation capture
- server-side prompt assembly with runtime context
- durable session state on the local dev server

What is missing is a single canonical lifecycle between `Create Task` and `resolved`.

## Product Goal

The first MCP release should support this loop:

1. Developer creates one annotate batch in the browser.
2. Inspecto stores it as a pending session.
3. An agent sees the pending session through MCP.
4. The agent reads the structured context.
5. The agent sends progress or follow-up replies back to Inspecto.
6. The agent marks the session resolved when work is complete.

This is enough to unlock:

- hands-free agent pickup
- a browser thread panel later
- replayable session history
- self-driving follow-ups in a later phase

## Recommended UX

The intended near-term flow is:

1. The developer creates a batch in `Annotate mode`.
2. Inspecto stores the batch as a durable session when the developer clicks `Create Task`.
3. A running agent calls `inspecto_claim_next`.
4. Inspecto waits for the next pending session, marks it `acknowledged`, and returns full context.
5. The agent works the session, replies into it, and resolves it when complete.

This gives us a clean split of responsibility:

- browser UI captures intent and page context
- MCP exposes the durable task state
- the agent runtime owns the watch loop and task execution

## Product Gaps After The First Working Loop

Once the minimal loop is working, we should treat it as "technically viable" rather than "fully productized."

Near-term UX priorities:

P0 priorities:

1. Keep the task path single-purpose
   Developers should not have to choose between multiple annotate delivery models.
   Improvement:
   keep `Create Task` as the canonical annotate submission path.

2. Improve session visibility
   The browser should make it obvious whether a session is pending, in progress, or completed.
   Improvement:
   add lightweight status affordances and a last-agent-update preview in the browser UI.

3. Make resolve more trustworthy
   A code edit alone should not always imply that the user-visible issue is done.
   Improvement:
   add a stronger completion handshake, especially for UI changes that should be visually confirmed before resolve.

P1 follow-ups:

4. Support better backlog selection
   As soon as several batches exist, "latest pending" is not always enough.
   Improvement:
   support filtering and selection by page, route, batch, or recency.

5. Close the verification loop
   Users care about whether the page changed, not only whether code changed.
   Improvement:
   connect session completion to clearer verification signals and better page-instance awareness.

These gaps should shape the product layer around MCP, even if the transport and tool layer are already working.

## Non-Goals

The first MCP release should not include:

- full browser automation
- generic MCP resources for every internal object
- multi-page persistence beyond the active local server lifecycle
- supporting multiple primary annotate delivery paths
- rich collaborative thread UI in the browser
- WebSocket-first transport

## Core Design

### 1. Introduce a Durable Annotation Session

The current annotate UX is already record-first. We should preserve that model and wrap one sent batch in a durable session object.

Suggested runtime model:

```ts
type AnnotationSessionStatus = 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed'

interface AnnotationSessionRecord {
  id: string
  note: string
  intent: AnnotationIntent
  targets: AnnotationTarget[]
}

interface AnnotationSessionMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  text: string
  createdAt: number
}

interface AnnotationWorkSession {
  id: string
  pageUrl?: string
  route?: string
  instruction: string
  annotations: AnnotationSessionRecord[]
  runtimeContext?: RuntimeContextEnvelope
  cssContextPrompt?: string
  status: AnnotationSessionStatus
  createdAt: number
  updatedAt: number
  acknowledgedAt?: number
  resolvedAt?: number
  messages: AnnotationSessionMessage[]
}
```

Notes:

- this model is intentionally close to existing `Annotation`, `FeedbackRecord`, and `SendAnnotationsToAiRequest`
- status must live outside prompt text
- replies must be stored as first-class messages, not appended into one blob

### 2. Add an In-Memory Session Store First

The first version does not need a database.

Add a server-owned in-memory store plus a small event bus:

- `createSession(payload)`
- `listSessions(filter)`
- `getSession(id)`
- `appendMessage(id, message)`
- `updateStatus(id, status)`
- `subscribe(listener)`

This matches the current local-dev architecture and aligns with the roadmap direction for an event bus.

Suggested placement:

- `packages/plugin/src/server/session-store.ts`
- `packages/plugin/src/server/session-events.ts`

### 3. Change Annotate Send Semantics

The current annotate send path should stop being "dispatch only".

New behavior for `POST /inspecto/api/v1/ai/dispatch/annotations`:

1. Validate and normalize the request.
2. Create an `AnnotationWorkSession`.
3. Return the new session id and status.
   Important:

- session creation should be the primary outcome
- annotate delivery should not depend on a second trigger surface

## MCP Surface

The MCP surface should be tool-first, not resource-first, and should avoid duplicate pickup paths.

### Required Tools

#### `inspecto_get_session`

Returns one session by id, including full annotation context.

Use cases:

- an agent already has a `sessionId`
- a browser or worker wants to rehydrate one known task directly

#### `inspecto_claim_next`

Waits for the next pending session, marks it `acknowledged`, and returns full annotation context.

Use cases:

- a hands-free agent wants the next unit of work
- a long-running agent loop needs one atomic wait-and-claim operation

#### `inspecto_reply`

Appends an agent message to a session.

Use cases:

- ask for clarification
- post progress
- provide a result summary

#### `inspecto_resolve`

Marks a session resolved and optionally attaches a final summary.

Use cases:

- agent completed a code change
- agent reviewed the issue and closed the loop

#### `inspecto_dismiss`

Closes a session without treating it as completed work.

Use cases:

- duplicate annotation batch
- invalid request
- no code action required after review

## HTTP API Shape

Before adding the MCP adapter, we should stabilize internal HTTP/session APIs.

Suggested endpoints:

```ts
GET  /inspecto/api/v1/sessions?status=pending
POST /inspecto/api/v1/sessions/claim
GET  /inspecto/api/v1/sessions/:id
POST /inspecto/api/v1/sessions/:id/reply
POST /inspecto/api/v1/sessions/:id/resolve
POST /inspecto/api/v1/sessions/:id/dismiss
GET  /inspecto/api/v1/sessions/events
```

Guidelines:

- keep `AI_BATCH_DISPATCH` for browser compatibility
- let it create a session under the hood
- make the MCP server call the same store and service layer instead of duplicating logic

## Rollout Strategy

The current hands-free design does not keep a parallel legacy pickup path for annotate sessions.

Recommended rollout:

### Phase A

- create durable sessions from annotate sends
- make `Create Task` the primary annotate action
- expose `inspecto_claim_next` as the only agent pickup entrypoint

### Phase B

- add the remaining session lifecycle tools backed by the same store
- add a lightweight stdio MCP entrypoint for agents that proxies into the local Inspecto dev server HTTP contract

### Phase C

- add browser-side status pill and message thread
- keep annotate task ownership in the MCP session loop

## Interaction with Existing IDE Routing

Current IDE routing remains valuable for:

- opening the right workspace
- passing source-linked prompts into supported tools
- preserving low-latency single-shot flows

MCP should own annotate task flow rather than mirror a second handoff path.

The split should be:

- `Inspect mode`: can stay optimized for immediate source inspection
- `Annotate mode`: creates durable sessions and is consumed through `inspecto_claim_next`

This matches the current product distinction between immediate inspect actions and batch annotate work.

## Type Evolution

The existing types in `packages/types/src/runtime.ts` already give us a good starting point:

- `FeedbackRecord`
- `FeedbackRecordDraft`
- `FeedbackRecordSession`
- `Annotation`
- `AnnotationSession`
- `SendAnnotationsToAiRequest`

Recommended additions:

```ts
type AnnotationSessionStatus = 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed'

interface AnnotationThreadMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  text: string
  createdAt: number
}

interface AnnotationWorkSession {
  id: string
  instruction: string
  annotations: Annotation[]
  runtimeContext?: RuntimeContextEnvelope
  cssContextPrompt?: string
  status: AnnotationSessionStatus
  messages: AnnotationThreadMessage[]
  createdAt: number
  updatedAt: number
}
```

## Open Questions

1. Should `inspecto_reply` automatically transition `acknowledged -> in_progress`, or should `resolve` be allowed directly after claim?

Current recommendation:

- agent-first flows should prefer `inspecto_claim_next` when claiming new work
- `inspecto_reply` can promote claimed sessions to `in_progress`
- `inspecto_dismiss` should be the explicit closeout path for duplicate or invalid tasks

2. Should annotate sessions persist across dev-server restarts, or is in-memory enough for the first release?
3. Should direct IDE dispatch remain enabled by default for annotate once MCP is available?
4. Do we want one shared session model for both inspect and annotate later, or should inspect stay ephemeral?

## Recommended Next Implementation Steps

1. Add session types in `@inspecto-dev/types`.
2. Add an in-memory session store in `packages/plugin/src/server`.
3. Change `dispatchAnnotationsToAi` to create and return sessions.
4. Add session HTTP endpoints and SSE events.
5. Add a minimal MCP server adapter with `claim_next`, `get_session`, `reply`, `resolve`, and `dismiss`.
6. Add a stdio `inspecto mcp` CLI entrypoint that discovers the local dev server and forwards tool calls into the stabilized HTTP API.
7. Update docs and browser UI only after the server contract is stable.

## Agent Entrypoint

The first agent-facing entrypoint can stay very small:

- command: `inspecto mcp`
- transport: stdio
- protocol: official MCP TypeScript SDK server over stdio
- backend: local Inspecto dev server HTTP/SSE endpoints

This keeps the process boundary clean:

- browser/plugin process owns the durable session store
- agent process owns MCP stdio and tool dispatch
- HTTP/SSE is the contract between them

Implementation note:

- prefer the official MCP TypeScript SDK for transport, lifecycle, and tool registration
- keep Inspecto-owned logic focused on server discovery plus HTTP/SSE calls into the local dev server

Example launch shape:

```json
{
  "mcpServers": {
    "inspecto": {
      "command": "inspecto",
      "args": ["mcp"]
    }
  }
}
```

If auto-discovery is not enough for a given environment, the agent can pass an explicit server URL:

```json
{
  "mcpServers": {
    "inspecto": {
      "command": "inspecto",
      "args": ["mcp", "--server-url", "http://0.0.0.0:5678"]
    }
  }
}
```

## Verification

Minimum test plan:

- add server tests for session creation from `AI_BATCH_DISPATCH`
- add tests for reply and resolve transitions
- add tests for watch/event delivery
- keep existing annotation prompt tests for compatibility where IDE dispatch is still enabled

Suggested commands:

- `pnpm --filter @inspecto-dev/plugin test`
- `pnpm --filter @inspecto-dev/types build`

## Decision

Inspecto should add MCP, but only through a minimal annotation session loop first.

The key architectural move is not "add an MCP server". The key move is "promote annotate batches into durable work sessions".

Once that exists, MCP tools, SSE streams, browser threads, and self-driving workflows all have a stable foundation.
