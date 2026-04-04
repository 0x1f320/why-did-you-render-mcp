# why-did-you-render-mcp

An MCP (Model Context Protocol) server that bridges [why-did-you-render](https://github.com/welldone-software/why-did-you-render) data from the browser to coding agents. It captures unnecessary React re-render reports in real time and exposes them as MCP tools, so agents can diagnose and fix performance issues without manual browser inspection.

## Architecture

```
Browser (React app)          MCP Server              Coding Agent
┌──────────────────┐   WS   ┌──────────────┐  stdio  ┌──────────┐
│ wdyr + client lib│───────▸│ ws → store   │◀───────▸│ Claude,  │
│                  │ :4649  │ MCP tools    │         │ Cursor…  │
└──────────────────┘        └──────────────┘         └──────────┘
```

- **Client** (`src/client/`) — Runs in the browser. Receives `why-did-you-render` update callbacks, sanitizes the render reason (stripping non-serializable values like functions and circular refs), and sends `RenderReport` messages over WebSocket.
- **Server** (`src/server/`) — Runs as a Node.js process. Accepts WebSocket connections from the client, stores render reports in memory, and exposes them via MCP tools over stdio.
  - `ws.ts` — WebSocket server that receives render reports from the browser client.
  - `store.ts` — In-memory store for render reports with query/clear operations.
  - `tools.ts` — Registers MCP tools: `get_unnecessary_renders`, `get_render_summary`, `clear_renders`.
- **Types** (`src/types.ts`) — Shared type definitions including `RenderReport`, `SafeReasonForUpdate`, and `WsMessage`.

## Tech Stack

- **Runtime**: Node.js 20+ (server), Browser (client)
- **Language**: TypeScript (strict mode)
- **Build**: tsdown (dual entry — `server/index` for Node, `client/index` for browser)
- **Package Manager**: pnpm
- **Linter/Formatter**: Biome (tabs, recommended rules)
- **Protocol**: MCP SDK (`@modelcontextprotocol/sdk`), WebSocket (`ws`)

## Commands

- `pnpm build` — Build both server and client
- `pnpm dev` — Watch mode build
- `pnpm check` — Lint and format check (Biome)
- `pnpm check:fix` — Auto-fix lint and format issues

## Git Workflow

- **All PRs targeting `dev` must be squash merged.** Do not use merge commits or rebase merges.
- **PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/).** Examples: `feat: add render timeline tool`, `fix: handle null displayName`, `refactor: extract ws reconnect logic`.
- **Issue titles must be written in natural language describing the objective.** Examples: "Support filtering renders by hook type", "Server crashes when client sends malformed JSON". Do not use conventional commit prefixes in issue titles.
