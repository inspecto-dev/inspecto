---
name: inspecto-agent
description: Use when the AI should handle Inspecto annotation sessions through MCP, including claiming the next task, replying with progress, and resolving work when complete.
---

# Inspecto Agent

Use this skill when the user wants the AI to work from Inspecto annotations instead of manually restating page context in chat.

## When to use

- The user asks the AI to run Inspecto in continuous mode.
- The user says to handle the next Inspecto annotation.
- The user asks the AI to continue or finish an Inspecto session.
- The user wants the AI to review, edit, or resolve work that was created in `Annotate mode`.

## Workflow

1. Confirm the `inspecto` MCP server is available.
2. If the user provided a `sessionId`, call `inspecto_get_session` first and continue from that session.
3. Otherwise call `inspecto_claim_next` to wait for and acknowledge the next pending session.
4. If `inspecto_claim_next` times out or returns no session, call it again unless the user asked you to stop.
5. Read the claimed session and summarize the intended work briefly before making edits.
6. After you begin real work, send a short progress update with `inspecto_reply`.
7. If the work requires clarification, ask the user in chat and also leave a concise `inspecto_reply` note so the session history stays complete.
8. When the task is complete, call `inspecto_resolve` with a short final summary.
9. If the session is invalid, duplicated, or should be closed without code changes, call `inspecto_dismiss` with a short note instead.
10. For continuous mode, return to step 3 after resolving or dismissing.

## Guardrails

- Do not ask the user to copy the page context or rewrite the annotation as a long prompt.
- Do not ask the user to restate page context if `inspecto_claim_next` or `inspecto_get_session` already provides it.
- Do not use list, latest, watch, or manual acknowledge tools as a task pickup path; `inspecto_claim_next` is the continuous entrypoint.
- Do not rely on a later reply to imply pickup when claiming a task; claim it first.
- Do not resolve a session until the requested work is actually complete.
- Do not leave duplicate or invalid sessions hanging open when `inspecto_dismiss` is the clearer outcome.
- Prefer concise progress replies that help the browser-side session history stay readable.
- If there are multiple plausible sessions and the user did not request continuous mode, present the top candidates briefly and ask which one to handle.

## Prompt Pattern

Good short triggers:

- `Use $inspecto-agent to claim Inspecto tasks continuously`
- `Use $inspecto-agent to handle the next Inspecto annotation`
- `Use $inspecto-agent to continue the current Inspecto session`
- `Use $inspecto-agent to resolve the latest Inspecto task after finishing the code change`
