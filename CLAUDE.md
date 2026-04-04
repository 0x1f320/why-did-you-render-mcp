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

- **Client** (`src/client/`) — Runs in the browser. Receives `why-did-you-render` update callbacks, sanitizes the render reason (stripping non-serializable values like functions and circular refs), and sends `RenderReport` messages over WebSocket. Auto-tags messages with `location.origin` as the project identifier. Patches `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` to track React commit IDs, enabling per-commit grouping of renders. Captures stack traces on each render update and parses them into structured `StackFrame` arrays (with source map resolution) so agents can pinpoint the exact source location of each re-render.
  - `utils/parse-stack.ts` — Parses `Error` stack traces into `StackFrame[]`. Filters out React internals, WDYR internals, and bundler noise. Classifies frames as `"hook"` (names starting with `use`) or `"component"`. Has both async (`parseStack`) and sync (`parseStackSync`) variants.
  - `utils/resolve-source-map.ts` — Resolves bundled file locations back to original source via `@jridgewell/trace-mapping`. Fetches and caches `.map` files; falls back to the bundled path if source maps are unavailable.
- **Server** (`src/server/`) — Runs as a Node.js process. Accepts WebSocket connections from the client, persists render reports to JSONL files, and exposes them via MCP tools over stdio.
  - `ws.ts` — WebSocket server with EADDRINUSE graceful handling.
  - `store/` — `RenderStore` class backed by JSONL files in `~/.wdyr-mcp/renders/`. Uses value dictionary deduplication (xxhash-wasm) to keep files compact.
  - `tools/` — One file per MCP tool: `get-renders`, `get-render-summary`, `get-commits`, `get-renders-by-commit`, `get-tracked-components`, `get-projects`, `clear-renders`.
- **Types** (`src/types.ts`) — Shared type definitions including `RenderReport`, `SafeReasonForUpdate`, `StackFrame`, `StackFrameLocation`, and `WsMessage`.

### Design Decisions

- **JSONL over SQLite** — Render data is ephemeral and the access pattern is simple (append, read all, filter, clear). JSONL avoids native addon dependencies (better-sqlite3) and migration complexity while supporting concurrent multi-process read/write.
- **Value dictionary deduplication** — Render reports often contain identical `prevValue`/`nextValue` objects across thousands of entries (e.g. the same prop object causing repeated re-renders). To avoid JSONL files growing to hundreds of MB, each file's first line is a content-addressed dictionary (`@@dict`) mapping xxhash-wasm h64 hashes to unique values. Render lines reference dictionary entries via `@@ref:<hash>` sentinel strings instead of inlining the full value. Only object/array values are dehydrated; primitives stay inline. On read, `readJsonl` transparently hydrates refs back to actual values, so consumers are unaffected. The dictionary is rewritten on each flush (acceptable because deduplication keeps files small).
- **No daemon process** — Instead of a separate long-running daemon managing shared state, each MCP instance is independent. The WS server is opportunistically claimed by whichever instance starts first; data sharing happens through the filesystem.
- **Project ID from `location.origin`** — The browser's origin is used as the project identifier because it's auto-available (zero config for the user) and unique per dev server. The MCP server doesn't need to know the project ID upfront — tools query the JSONL store and disambiguate as needed.
- **One file per function** — Tools and utilities are split into individual files (`tools/<tool-name>.ts`, `store/utils/<fn-name>.ts`) for clarity. Each file has a single responsibility.
- **Commit ID via DevTools hook** — React calls `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` once per commit, synchronously. The client patches this hook to increment a counter, and WDYR's notifier (called during render phase) reads the current counter value. Since React guarantees `commitRoot → next renderRoot` ordering, renders within the same commit share the same ID. If the hook doesn't exist at init time, the client creates a minimal stub so React will call into it.
- **Stack trace capture via `Error` objects** — On each render update, the client creates a new `Error()` to capture the call stack. `parseStack` uses `error-stack-parser` to extract frames, then filters out React reconciler internals (~50+ function names), WDYR internals, and known noise files (`react-dom`, `scheduler`, `installHook`, etc.). Each surviving frame is classified as `"hook"` or `"component"` based on naming convention (`use*` → hook). Source map resolution (`@jridgewell/trace-mapping`) maps bundled locations back to original source files. Stack frames are only included in `RenderReport` when non-empty, keeping payloads lean for renders where capture fails or yields no useful frames.

## Tech Stack

- **Runtime**: Node.js 20+ (server), Browser (client)
- **Language**: TypeScript (strict mode)
- **Build**: tsdown (dual entry — `server/index` for Node, `client/index` for browser)
- **Package Manager**: pnpm
- **Linter/Formatter**: Biome (tabs, recommended rules)
- **Protocol**: MCP SDK (`@modelcontextprotocol/sdk`), WebSocket (`ws`)
- **Storage**: JSONL files (`~/.wdyr-mcp/renders/`) with value dictionary deduplication
- **Hashing**: xxhash-wasm (WASM, no native addons)

## Commands

- `pnpm build` — Build both server and client
- `pnpm dev` — Watch mode build
- `pnpm check` — Lint and format check (Biome)
- `pnpm check:fix` — Auto-fix lint and format issues

## Project Structure

```
src/
├── client/
│   ├── index.ts                    # Browser client (WS + sanitization)
│   └── utils/
│       ├── parse-stack.ts          # Error stack → StackFrame[] parser
│       └── resolve-source-map.ts   # Source map resolution (trace-mapping)
├── server/
│   ├── index.ts                    # Entry point (MCP + WS server init)
│   ├── ws.ts                       # WebSocket server (EADDRINUSE handling)
│   ├── store/
│   │   ├── index.ts                # RenderStore export + singleton
│   │   ├── render-store.ts         # RenderStore class
│   │   ├── types.ts                # StoredRender, RenderWithProject
│   │   └── utils/
│   │       ├── read-jsonl.ts       # JSONL file parser (dict-aware)
│   │       ├── sanitize-project-id.ts
│   │       ├── to-result.ts        # StoredRender → RenderWithProject
│   │       └── value-dict.ts       # xxhash-wasm dehydrate/hydrate
│   └── tools/
│       ├── index.ts                # registerTools barrel
│       ├── get-renders.ts          # All renders (with stack traces)
│       ├── get-render-summary.ts   # Renders grouped by component
│       ├── get-commits.ts          # List React commit IDs
│       ├── get-renders-by-commit.ts # Renders for a specific commit
│       ├── get-tracked-components.ts # Currently tracked components
│       ├── get-projects.ts         # Active projects list
│       ├── clear-renders.ts        # Clear stored render data
│       └── utils/
│           ├── resolve-project.ts  # Auto-select or disambiguate project
│           └── text-result.ts      # MCP text response helper
└── types.ts                        # Shared types (RenderReport, WsMessage)
```

## Git Workflow

- **All PRs targeting `dev` must be squash merged.** Do not use merge commits or rebase merges.
- **PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/).** Examples: `feat: add render timeline tool`, `fix: handle null displayName`, `refactor: extract ws reconnect logic`.
- **Issue titles must be written in natural language describing the objective.** Examples: "Support filtering renders by hook type", "Server crashes when client sends malformed JSON". Do not use conventional commit prefixes in issue titles.
