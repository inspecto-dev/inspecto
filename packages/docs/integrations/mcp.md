# MCP Integration

If your AI runtime supports MCP (Model Context Protocol), Inspecto can expose its annotate session workflow directly to your agent through a dedicated MCP stdio entrypoint.

This is especially useful if you are using Inspecto in **Standalone / Clipboard Mode** (`ide: "none"`) and want a direct, hands-free connection to your AI without relying on IDE extensions.

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

Inspecto supports two workflows for collaborating with your agent, depending on the constraints of your AI client (e.g., Cursor, Claude Desktop). Before starting, make sure your `.inspecto/settings.local.json` sets `"annotate.deliveryMode": "agent"` (or `"both"`).

### Mode 1: Asynchronous Queue (Recommended for most clients)

Because most conversational AI clients have strict timeout limits for tool calls (e.g., forcefully disconnecting if a tool hangs for more than 2 minutes), we recommend this async workflow:

1. **Immersive Annotation**: Open `Annotate mode` in the browser and collect UI issues at your own pace.
2. **Submit Tasks**: Every time you click `Create Task`, the session is safely queued in your local dev server. You can queue multiple tasks.
3. **Batch Processing**: Go back to your AI assistant and say: _"Please process the UI annotations I just created."_
4. **Agent Execution**: Your agent will call `inspecto_claim_next` and instantly consume the pending tasks from the local queue.

### Mode 2: Continuous Watch Mode (If your agent supports background running)

If your agent can run as a background worker, or if your client allows long-running tool executions, you can use the ultimate hands-free mode:

1. **Start Watching**: Tell your agent: _"Please enter continuous annotation mode and wait for my next frontend tasks (you can set a long timeout, like 10 minutes)."_
2. **Agent Hangs**: The agent calls `inspecto_claim_next` with a long `timeoutMs` and waits.
3. **Real-time Processing**: The moment you click `Create Task` in the browser, the agent receives the context in milliseconds and starts writing code immediately—no window switching required.

> **Important limitation**: Most conversational AI clients (including standard chat interfaces) enforce strict tool call timeouts (typically 1–2 minutes). If you do not submit an annotation before the timeout expires, the `inspecto_claim_next` call fails and the agent returns to idle. In that case, your annotation remains in the queue but will not be processed until you explicitly ask the agent to check again. For truly continuous background listening, use a client that supports persistent agents (e.g., Claude Desktop, Cursor Agent Mode).

## Available MCP Tools

The MCP surface is intentionally limited to the hands-free session workflow. These tools proxy into the local Inspecto dev server, which remains the source of truth for durable annotation sessions:

- `inspecto_claim_next`: Waits for the next pending annotation session and automatically acknowledges it.
- `inspecto_get_session`: Fetches a specific session by its ID.
- `inspecto_reply`: Used by the agent to send progress updates back to the session.
- `inspecto_resolve`: Used by the agent to mark the task as complete.
- `inspecto_dismiss`: Used by the agent if the session should be closed without action.
