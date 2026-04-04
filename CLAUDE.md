# why-did-you-render-mcp

An MCP (Model Context Protocol) server that bridges [why-did-you-render](https://github.com/welldone-software/why-did-you-render) data from the browser to coding agents. It captures unnecessary React re-render reports in real time and exposes them as MCP tools, so agents can diagnose and fix performance issues without manual browser inspection.

## Architecture

```
Browser (project-a) ──┐
Browser (project-b) ──┤
                      ▼
                MCP #1 → WS(:4649) ✅ (first instance binds)
                MCP #2 → WS(:4649) ❌ → skip (EADDRINUSE)
                      │
                      ▼
               ~/.wdyr-mcp/renders/  (JSONL files, shared across instances)
               ├─ http___localhost_3000.jsonl
               └─ http___localhost_5173.jsonl
```

- **Multiple MCP instances** can run simultaneously. Only the first instance binds the WebSocket server; others gracefully skip via EADDRINUSE handling. All instances read/write the same JSONL files.
- **Multi-project support** — Each project is identified by the browser's `location.origin` (e.g. `http://localhost:3000`). Render data is stored in per-project JSONL files under `~/.wdyr-mcp/renders/`.
- **Project disambiguation** — When only one project exists, tools auto-select it. When multiple exist, tools return a message instructing the agent to ask the user for their dev server URL.

### Components

- **Client** (`src/client/`) — Runs in the browser. Receives `why-did-you-render` update callbacks, sanitizes the render reason (stripping non-serializable values like functions and circular refs), and sends `RenderReport` messages over WebSocket. Auto-tags messages with `location.origin` as the project identifier. Patches `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` to track React commit IDs, enabling per-commit grouping of renders.
- **Server** (`src/server/`) — Runs as a Node.js process. Accepts WebSocket connections from the client, persists render reports to JSONL files, and exposes them via MCP tools over stdio.
  - `ws.ts` — WebSocket server with EADDRINUSE graceful handling.
  - `store/` — `RenderStore` class backed by JSONL files in `~/.wdyr-mcp/renders/`.
  - `tools/` — One file per MCP tool: `get-unnecessary-renders`, `get-render-summary`, `get-commits`, `get-renders-by-commit`, `get-projects`, `clear-renders`.
- **Types** (`src/types.ts`) — Shared type definitions including `RenderReport`, `SafeReasonForUpdate`, and `WsMessage`.

### Design Decisions

- **JSONL over SQLite** — Render data is ephemeral and the access pattern is simple (append, read all, filter, clear). JSONL avoids native addon dependencies (better-sqlite3) and migration complexity while supporting concurrent multi-process read/write.
- **No daemon process** — Instead of a separate long-running daemon managing shared state, each MCP instance is independent. The WS server is opportunistically claimed by whichever instance starts first; data sharing happens through the filesystem.
- **Project ID from `location.origin`** — The browser's origin is used as the project identifier because it's auto-available (zero config for the user) and unique per dev server. The MCP server doesn't need to know the project ID upfront — tools query the JSONL store and disambiguate as needed.
- **One file per function** — Tools and utilities are split into individual files (`tools/<tool-name>.ts`, `store/utils/<fn-name>.ts`) for clarity. Each file has a single responsibility.
- **Commit ID via DevTools hook** — React calls `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` once per commit, synchronously. The client patches this hook to increment a counter, and WDYR's notifier (called during render phase) reads the current counter value. Since React guarantees `commitRoot → next renderRoot` ordering, renders within the same commit share the same ID. If the hook doesn't exist at init time, the client creates a minimal stub so React will call into it.

## Tech Stack

- **Runtime**: Node.js 20+ (server), Browser (client)
- **Language**: TypeScript (strict mode)
- **Build**: tsdown (dual entry — `server/index` for Node, `client/index` for browser)
- **Package Manager**: pnpm
- **Linter/Formatter**: Biome (tabs, recommended rules)
- **Protocol**: MCP SDK (`@modelcontextprotocol/sdk`), WebSocket (`ws`)
- **Storage**: JSONL files (`~/.wdyr-mcp/renders/`)

## Commands

- `pnpm build` — Build both server and client
- `pnpm dev` — Watch mode build
- `pnpm check` — Lint and format check (Biome)
- `pnpm check:fix` — Auto-fix lint and format issues

## Project Structure

```
src/
├── client/
│   └── index.ts                    # Browser client (WS + sanitization)
├── server/
│   ├── index.ts                    # Entry point (MCP + WS server init)
│   ├── ws.ts                       # WebSocket server (EADDRINUSE handling)
│   ├── store/
│   │   ├── index.ts                # RenderStore export + singleton
│   │   ├── render-store.ts         # RenderStore class
│   │   ├── types.ts                # StoredRender, RenderWithProject
│   │   └── utils/
│   │       ├── read-jsonl.ts       # JSONL file parser
│   │       ├── sanitize-project-id.ts
│   │       └── to-result.ts        # StoredRender → RenderWithProject
│   └── tools/
│       ├── index.ts                # registerTools barrel
│       ├── get-unnecessary-renders.ts
│       ├── get-render-summary.ts
│       ├── get-commits.ts
│       ├── get-renders-by-commit.ts
│       ├── get-projects.ts
│       ├── clear-renders.ts
│       └── utils/
│           ├── resolve-project.ts  # Auto-select or disambiguate project
│           └── text-result.ts      # MCP text response helper
└── types.ts                        # Shared types (RenderReport, WsMessage)
```

## Git Workflow

- **All PRs targeting `dev` must be squash merged.** Do not use merge commits or rebase merges.
- **PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/).** Examples: `feat: add render timeline tool`, `fix: handle null displayName`, `refactor: extract ws reconnect logic`.
- **Issue titles must be written in natural language describing the objective.** Examples: "Support filtering renders by hook type", "Server crashes when client sends malformed JSON". Do not use conventional commit prefixes in issue titles.
