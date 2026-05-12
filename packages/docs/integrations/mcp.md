# MCP Integration

MCP mode lets an AI agent pick up Annotate tasks from Inspecto, work on them, and report progress back to the browser. You do not need to copy DOM paths, screenshots, or notes by hand: click components in the browser, create a task, then ask your agent to process the queue.

Use this page if you want Inspecto to work with an MCP-capable agent, especially in **Standalone / Browser-only mode** (`ide: "none"`).

## The simplest flow

1. **Start your app with Inspecto enabled.** Keep the local dev server running.
2. **Install the Inspecto agent skill** so your agent knows how to claim and finish tasks.
3. **Connect Inspecto as an MCP server** in your AI client. The easiest path is `add-mcp`; the manual JSON config is the fallback.
4. **Open Annotate mode** in the browser, click one or more components, add notes, then click **Create Task**.
5. **Paste the prompt below into your agent.** The agent claims the queued task, works on it, sends progress replies, and resolves the session when finished.

<CopyPrompt
  title="Process queued Inspecto tasks"
  description="Paste this into your MCP-capable agent after clicking Create Task in Annotate mode."
  prompt="Please process my pending Inspecto task. Use the Inspecto MCP tools to claim the next session, make the needed changes, run checks, and resolve it when finished."
/>

## 1. Install the agent skill

If your agent supports the [skills](https://www.npmjs.com/package/skills) CLI, install Inspecto's agent skill with one command:

```bash
npx skills add inspecto-dev/inspecto --skill inspecto-agent
```

This installs the `inspecto-agent` instructions into the agent directories detected by `skills`. If you want a non-interactive global install for one agent, pass `--agent`, `--global`, and `--yes`:

```bash
npx skills add inspecto-dev/inspecto --skill inspecto-agent --agent claude-code --global --yes
```

Replace `claude-code` with the agent you use, such as `codex`, `cursor`, `trae`, or `codebuddy`.

## 2. Add the MCP server

Recommended: use [`add-mcp`](https://www.npmjs.com/package/add-mcp) to write the MCP config for your agent:

::: code-group

```bash [Cursor]
npx -y add-mcp@latest "npx -y @inspecto-dev/cli@latest mcp" --name inspecto -a cursor -y
```

```bash [Claude Code]
npx -y add-mcp@latest "npx -y @inspecto-dev/cli@latest mcp" --name inspecto -a claude-code -y
```

```bash [Codex]
npx -y add-mcp@latest "npx -y @inspecto-dev/cli@latest mcp" --name inspecto -a codex -y
```

```bash [VS Code]
npx -y add-mcp@latest "npx -y @inspecto-dev/cli@latest mcp" --name inspecto -a vscode -y
```

:::

`add-mcp` is a good fit here because it handles the different MCP config file locations for Cursor, Claude Code, Codex, VS Code, OpenCode, and other agents. Prefer passing `-a <agent>` so the command updates only the client you intend to use. Without `-a`, `add-mcp -y` may install to every project-capable agent when none are detected.

If you prefer to edit config manually, use this shape for clients that expect `mcpServers` JSON, such as Cursor or Claude Code project config:

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

If you run multiple local projects and the agent connects to the wrong Inspecto server, pin the server URL. With `add-mcp`, put the extra flag inside the quoted command; for manual config, add it to `args`:

```bash
npx -y add-mcp@latest "npx -y @inspecto-dev/cli@latest mcp --server-url http://127.0.0.1:5678" --name inspecto -a cursor -y
```

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

If the browser and agent need to reach the dev server through a different hostname, set `server.publicUrl` in `.inspecto/settings.local.json` so both sides use the same URL.

## 3. Send Annotate tasks to MCP

Make sure Annotate mode uses MCP:

```json
{
  "annotate.channel": "mcp"
}
```

Then use the browser:

1. Open **Annotate mode**.
2. Click the UI elements involved in the issue.
3. Write short notes such as “make this button primary” or “align this card with the header”.
4. Click **Create Task**.
5. Ask your agent to process the queued task using the copyable prompt above.

The Annotate sidebar becomes the task timeline. It shows when the task is queued, claimed by the agent, updated with progress replies, and resolved or dismissed.

## 4. Optional: keep the agent watching

If your AI client supports long-running or background agents, you can ask it to wait for the next task instead of manually prompting it after each **Create Task**.

<CopyPrompt
  title="Wait for the next Inspecto task"
  description="Use this only with clients that allow long-running tool calls or background agents."
  prompt="Please watch for Inspecto tasks. When a task appears, claim it, fix it, run checks, and resolve it. Continue until I ask you to stop."
/>

Most chat-style clients enforce tool-call timeouts. If the agent times out while waiting, your task is still safe in Inspecto; just send the first prompt again after creating the task.

## Workflow buttons

MCP also supports project-level workflow buttons. Add `kind: "workflow"` items to `.inspecto/prompts.json`, then click them from Annotate mode. These tasks do not need selected DOM elements; Inspecto adds project metadata such as root path, branch, and git status.

```json
[
  {
    "id": "deploy-preview",
    "kind": "workflow",
    "label": "Deploy Preview",
    "prompt": "Deploy the current branch to the preview environment using the available deploy skill, MCP servers, or CLI tools. Do not deploy production. Reply with the preview URL and resolve the Inspecto session when finished.",
    "confirm": true
  }
]
```

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

## Available MCP tools

You usually do not need to call these tools manually. Your agent uses them after you paste the prompt.

- `inspecto_claim_next`: Claim the next pending annotation or workflow session.
- `inspecto_get_session`: Fetch a specific session by ID.
- `inspecto_reply`: Send progress updates back to the browser timeline.
- `inspecto_resolve`: Mark the task as completed.
- `inspecto_dismiss`: Close a task without making changes.

<script setup>
import CopyPrompt from '../components/CopyPrompt.vue'
</script>
