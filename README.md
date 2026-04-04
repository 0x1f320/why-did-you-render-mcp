# why-did-you-render-mcp

An [MCP](https://modelcontextprotocol.io/) server that bridges [why-did-you-render](https://github.com/welldone-software/why-did-you-render) data from the browser to coding agents. It captures unnecessary React re-render reports in real time and exposes them as MCP tools, so agents can diagnose and fix performance issues without manual browser inspection.

## How It Works

```
Browser (React app)
  │
  │  why-did-you-render detects unnecessary re-render
  │
  ▼
Client (runs in browser)  ── WebSocket ──▶  MCP Server (Node.js)
                                                │
                                                ├─ Persists to ~/.wdyr-mcp/renders/
                                                │
                                                ▼
                                          Coding Agent (Claude, etc.)
                                          queries via MCP tools
```

The **client** runs inside your React app alongside `why-did-you-render`. Whenever an unnecessary re-render is detected, it sanitizes the render data and sends it over WebSocket to the **MCP server**. The server stores reports as JSONL files and exposes them through MCP tools that coding agents can query.

## Installation

```sh
npm install @0x1f320.sh/why-did-you-render-mcp @welldone-software/why-did-you-render
```

## Setup

### 1. Configure why-did-you-render with the client

In your app's entry point (e.g. `src/main.tsx` or `src/index.tsx`), set up `why-did-you-render` with the MCP client as its notifier:

```tsx
import React from "react";
import whyDidYouRender from "@welldone-software/why-did-you-render";
import { buildOptions } from "@0x1f320.sh/why-did-you-render-mcp/client";

if (process.env.NODE_ENV === "development") {
  whyDidYouRender(React, {
    ...buildOptions(),
    trackAllPureComponents: true,
  });
}
```

The client automatically uses `location.origin` as the project identifier and connects to `ws://localhost:4649` by default. You can customize both:

```ts
const { notifier } = buildOptions({
  wsUrl: "ws://localhost:5555",
  projectId: "my-app",
});
```

### 2. Add the MCP server to your agent

<details>
<summary>Claude Code</summary>

```sh
claude mcp add why-did-you-render -- npx -y @0x1f320.sh/why-did-you-render-mcp
```

</details>

<details>
<summary>Claude Desktop</summary>

```sh
claude mcp add-json why-did-you-render '{"command":"npx","args":["-y","@0x1f320.sh/why-did-you-render-mcp"]}' -s user
```

Or manually edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) / `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "why-did-you-render": {
      "command": "npx",
      "args": ["-y", "@0x1f320.sh/why-did-you-render-mcp"]
    }
  }
}
```

</details>

<details>
<summary>Cursor</summary>

```sh
cursor --add-mcp '{"name":"why-did-you-render","command":"npx","args":["-y","@0x1f320.sh/why-did-you-render-mcp"]}'
```

Or add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "why-did-you-render": {
      "command": "npx",
      "args": ["-y", "@0x1f320.sh/why-did-you-render-mcp"]
    }
  }
}
```

</details>

<details>
<summary>Windsurf</summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "why-did-you-render": {
      "command": "npx",
      "args": ["-y", "@0x1f320.sh/why-did-you-render-mcp"]
    }
  }
}
```

</details>

<details>
<summary>VS Code (GitHub Copilot)</summary>

```sh
code --add-mcp '{"name":"why-did-you-render","command":"npx","args":["-y","@0x1f320.sh/why-did-you-render-mcp"]}'
```

Or add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "why-did-you-render": {
      "command": "npx",
      "args": ["-y", "@0x1f320.sh/why-did-you-render-mcp"]
    }
  }
}
```

</details>

### 3. Start your dev server and interact with the app

Once both the MCP server and your React dev server are running, interact with your app in the browser. The agent can now query re-render data using the MCP tools below.

## MCP Tools

| Tool | Description |
| --- | --- |
| `get_unnecessary_renders` | Returns all captured unnecessary re-renders. Optionally filter by `component` name. |
| `get_render_summary` | Returns a summary of re-renders grouped by component with counts. |
| `get_commits` | Lists React commit IDs that have recorded render data. Use these IDs with `get_renders_by_commit`. |
| `get_renders_by_commit` | Returns all unnecessary re-renders for a specific React commit ID. |
| `get_projects` | Lists all active projects (identified by their origin URL). |
| `clear_renders` | Clears all stored render data. Optionally scope to a specific project. |

When multiple projects are active, tools accept an optional `project` parameter (the browser's origin URL, e.g. `http://localhost:3000`). If omitted and only one project exists, it is auto-selected.

### Commit-level grouping

Each render report is tagged with a React **commit ID**, allowing agents to inspect which components re-rendered together in the same commit. The client tracks commits by hooking into `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot`, which React calls synchronously once per commit. A typical workflow:

1. Call `get_commits` to list available commit IDs
2. Call `get_renders_by_commit` with a specific ID to see all renders in that commit

## Architecture

```
Browser (project-a) ──┐
Browser (project-b) ──┤
                      ▼
                MCP #1 → WS(:4649)  (first instance binds)
                MCP #2 → WS(:4649)  → skip (EADDRINUSE)
                      │
                      ▼
               ~/.wdyr-mcp/renders/  (JSONL files, shared across instances)
               ├─ http___localhost_3000.jsonl
               └─ http___localhost_5173.jsonl
```

- **Multiple MCP instances** can run simultaneously. Only the first instance starts the WebSocket server; others gracefully skip. All instances share the same JSONL data directory.
- **Multi-project support** — Each project is identified by `location.origin`. Render data is stored in per-project JSONL files.
- **No daemon required** — Each MCP instance is independent. The WebSocket server is opportunistically claimed by whichever instance starts first.
- **Value dictionary deduplication** — Render reports often repeat the same `prevValue`/`nextValue` objects across thousands of entries. Each JSONL file stores a content-addressed dictionary on its first line, mapping xxhash-wasm hashes to unique values. Render lines reference them via `@@ref:<hash>` sentinels instead of inlining the full object, dramatically reducing file size. Reads hydrate refs transparently.

## Configuration

| Environment Variable | Default | Description |
| --- | --- | --- |
| `WDYR_WS_PORT` | `4649` | WebSocket server port |

## License

MIT
