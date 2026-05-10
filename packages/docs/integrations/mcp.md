# MCP Integration

If your AI runtime supports MCP (Model Context Protocol), Inspecto can expose its annotate session workflow directly to your agent through a dedicated MCP stdio entrypoint.

This is especially useful if you are using Inspecto in **Standalone / Clipboard Mode** (`ide: "none"`) and want a direct, hands-free connection to your AI without relying on IDE extensions. In MCP mode, the browser also becomes a live session surface: Annotate mode can show when a task is queued, claimed by the agent, updated with progress replies, and resolved or dismissed.

MCP also unlocks Inspecto's custom workflow buttons. You can define `kind: "workflow"` prompts in `.inspecto/prompts.json`, such as `Deploy Preview` or `Review & PR`. When clicked, Inspecto queues a workflow session with your instruction and project metadata, and the agent can use its own skills, MCP servers, and tools to complete the command.

## Configuration

To connect Inspecto to your agent, add the following configuration to your agent's MCP settings (for example, in Claude Desktop or Cursor MCP settings):

```json
{
  "mcpServers": {
    "inspecto": {
      "command": "npx",
      "args": ["-y", "@inspecto-dev/cli@latest", "mcp"]
    }
  }
}
```

If auto-discovery does not find the right local dev server (for example, when running multiple projects), you can pass an explicit URL:

```json
{
  "mcpServers": {
    "inspecto": {
      "command": "npx",
      "args": ["-y", "@inspecto-dev/cli@latest", "mcp", "--server-url", "http://127.0.0.1:5678"]
    }
  }
}
```

If the browser or agent reaches the Inspecto dev server through a different hostname than the bind address, set `.inspecto/settings.local.json` with `server.publicUrl` so browser injection and MCP discovery use the same reachable URL.

## Recommended Workflows

Inspecto supports two workflows for collaborating with your agent, depending on the constraints of your AI client (e.g., Cursor, Claude Desktop). Before starting, make sure your `.inspecto/settings.local.json` sets `"annotate.channel": "mcp"`.

### Browser-side Session Timeline

When `annotate.channel` is set to `mcp`, clicking `Create Task` creates a durable annotation session on the local Inspecto dev server. The Annotate sidebar then displays the latest session timeline so you can track the handoff from the same browser context where the issue was found.

The timeline includes:

- task creation / queued state;
- agent acknowledgement after `inspecto_claim_next` succeeds;
- progress messages sent through `inspecto_reply`;
- final completion through `inspecto_resolve` or closure through `inspecto_dismiss`.

This makes MCP mode different from a plain prompt handoff: the agent can report back into the browser while it works, and you do not need to infer task state from the chat window alone.

### Custom Workflow Buttons

Workflow buttons are configured in `.inspecto/prompts.json` alongside inspect menu prompts:

```json
[
  {
    "id": "deploy-preview",
    "kind": "workflow",
    "label": "Deploy Preview",
    "prompt": "Deploy the current branch to the preview environment using the available deploy skill, MCP servers, or CLI tools. Reply with the preview URL and mark the Inspecto session resolved when finished.",
    "confirm": true
  }
]
```

Compared with a normal annotation task, a workflow session is more like a project command. It can include zero selected DOM annotations, and Inspecto appends project metadata such as the project root, current branch, and git status so the agent has enough context to act. The agent still reports progress through `inspecto_reply` and finishes with `inspecto_resolve` or `inspecto_dismiss`.

Use this split when deciding what to create:

| Session type       | Starts from                          | Best for                                      | Needs DOM annotations? |
| :----------------- | :----------------------------------- | :-------------------------------------------- | :--------------------- |
| Annotation session | Selected elements + per-node notes   | UI fixes, design review, component refactors  | Usually yes            |
| Workflow session   | A configured `kind: "workflow"` item | Deploy, PR, release, test, docs, batch review | No                     |

Useful workflow prompt templates:

::: code-group

```json [Deploy Preview]
{
  "id": "deploy-preview",
  "kind": "workflow",
  "label": "Deploy Preview",
  "prompt": "Deploy the current branch to the preview environment using the available deploy skill, MCP servers, or CLI tools. Do not deploy production. Reply with the preview URL and resolve the Inspecto session when finished.",
  "confirm": true
}
```

```json [Review & PR]
{
  "id": "review-pr",
  "kind": "workflow",
  "label": "Review & PR",
  "prompt": "Review the current branch, run the appropriate checks, summarize the changes, and create a pull request if everything is safe. Ask before pushing or merging. Reply with the PR link and resolve the Inspecto session when finished.",
  "confirm": true
}
```

```json [Release Notes]
{
  "id": "release-notes",
  "kind": "workflow",
  "label": "Release Notes",
  "prompt": "Inspect the current branch and recent commits, then draft concise release notes grouped by feature, fix, and documentation changes. Reply with the markdown release notes and resolve the Inspecto session when finished."
}
```

:::

### Mode 1: Asynchronous Queue (Recommended for most clients)

Because most conversational AI clients have strict timeout limits for tool calls (e.g., forcefully disconnecting if a tool hangs for more than 2 minutes), we recommend this async workflow:

1. **Immersive Annotation**: Open `Annotate mode` in the browser and collect UI issues at your own pace.
2. **Submit Tasks**: Every time you click `Create Task`, the session is safely queued in your local dev server. You can queue multiple tasks.
3. **Track from the Browser**: Keep the Annotate sidebar open to see the queued task and later agent progress.
4. **Batch Processing**: Go back to your AI assistant and say: _"Please process the UI annotations I just created."_
5. **Agent Execution**: Your agent will call `inspecto_claim_next` and instantly consume the pending tasks from the local queue. Progress replies and final status are reflected in the timeline.

### Mode 2: Continuous Watch Mode (If your agent supports background running)

If your agent can run as a background worker, or if your client allows long-running tool executions, you can use the ultimate hands-free mode:

1. **Start Watching**: Tell your agent: _"Please enter continuous annotation mode and wait for my next frontend tasks (you can set a long timeout, like 10 minutes)."_
2. **Agent Hangs**: The agent calls `inspecto_claim_next` with a long `timeoutMs` and waits.
3. **Real-time Processing**: The moment you click `Create Task` in the browser, the agent receives the context in milliseconds and starts writing code immediately—no window switching required. The browser timeline updates as the agent acknowledges, replies, and resolves the session.

> **Important limitation**: Most conversational AI clients (including standard chat interfaces) enforce strict tool call timeouts (typically 1–2 minutes). If you do not submit an annotation before the timeout expires, the `inspecto_claim_next` call fails and the agent returns to idle. In that case, your annotation remains in the queue but will not be processed until you explicitly ask the agent to check again. For truly continuous background listening, use a client that supports persistent agents (e.g., Claude Desktop, Cursor Agent Mode).

## Available MCP Tools

The MCP surface is intentionally limited to the hands-free session workflow. These tools proxy into the local Inspecto dev server, which remains the source of truth for durable annotation sessions:

- `inspecto_claim_next`: Waits for the next pending annotation session and automatically acknowledges it. This changes the browser timeline from queued to acknowledged.
- `inspecto_get_session`: Fetches a specific session by its ID.
- `inspecto_reply`: Used by the agent to send progress updates back to the session. These replies appear in the browser timeline.
- `inspecto_resolve`: Used by the agent to mark the task as complete. The timeline records the resolved state.
- `inspecto_dismiss`: Used by the agent if the session should be closed without action. The timeline records the dismissed state.
