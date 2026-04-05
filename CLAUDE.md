# why-did-you-render-mcp

An MCP (Model Context Protocol) server that bridges [why-did-you-render](https://github.com/welldone-software/why-did-you-render) data from the browser to coding agents. It captures unnecessary React re-render reports in real time and exposes them as MCP tools, so agents can diagnose and fix performance issues without manual browser inspection.

## Architecture

```
Browser (project-a) ──┐
Browser (project-b) ──┤
                      ▼
                MCP #1 → WS(:4649) ✅ (first instance binds, "owner")
                MCP #2 → WS(:4649) ❌ → relay client ──▶ MCP #1
                      │
                      ▼
               ~/.wdyr-mcp/
               ├─ renders/  (JSONL files, shared across instances)
               │  ├─ http___localhost_3000.jsonl
               │  └─ http___localhost_5173.jsonl
               └─ snapshots/  (JSON files, named snapshots)
                  └─ before-fix.json
```

- **Multiple MCP instances** can run simultaneously. Only the first instance (the "owner") binds the WebSocket server; others gracefully skip via EADDRINUSE handling and instead connect as socket.io clients to the owner for relaying commands (e.g. pause/resume). All instances read/write the same JSONL files.
- **Multi-project support** — Each project is identified by the browser's `location.origin` (e.g. `http://localhost:3000`). Render data is stored in per-project JSONL files under `~/.wdyr-mcp/renders/`.
- **Project disambiguation** — When only one project exists, tools auto-select it. When multiple exist, tools return a message instructing the agent to ask the user for their dev server URL.

### Packages

This is a pnpm workspace monorepo with three packages:

- **`@0x1f320.sh/why-did-you-render-mcp`** (`packages/server/`) — MCP server (Node.js). Published to npm.
- **`@0x1f320.sh/why-did-you-render-mcp-client`** (`packages/client/`) — Browser client. Published to npm independently, so users can install it without server dependencies.
- **`@why-did-you-render-mcp/types`** (`packages/types/`) — Shared type definitions. Private, internal-only (not published). Both client and server depend on it via `workspace:*`.

### Components

- **Client** (`packages/client/`) — Runs in the browser. Receives `why-did-you-render` update callbacks, sanitizes the render reason (stripping non-serializable values like functions and circular refs), and sends `RenderReport` messages over WebSocket in batches. Auto-tags messages with `location.origin` as the project identifier. Patches `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` to track React commit IDs and capture `actualDuration` from React Fiber, enabling per-commit grouping and duration tracking. Captures stack traces on each render update and parses them into structured `StackFrame` arrays (with source map resolution) so agents can pinpoint the exact source location of each re-render. Detects HMR events (Vite `import.meta.hot` and webpack module.hot) and notifies the server so `wait_for_renders` can time its collection.
  - `utils/parse-stack.ts` — Parses `Error` stack traces into `StackFrame[]`. Filters out React internals, WDYR internals, and bundler noise. Classifies frames as `"hook"` (names starting with `use`) or `"component"`. Has both async (`parseStack`) and sync (`parseStackSync`) variants.
  - `utils/resolve-source-map.ts` — Resolves bundled file locations back to original source via `@jridgewell/trace-mapping`. Fetches and caches `.map` files; falls back to the bundled path if source maps are unavailable.
  - `utils/describe-value.ts` — Serializes complex values (React elements, DOM nodes, Maps, Sets, class instances, Errors) into JSON-safe descriptions with circular reference detection and max depth limiting.
  - `utils/sanitize-reason.ts` — Safe serialization of WDYR's `UpdateInfo.reason`, delegating to `sanitize-differences.ts` for hook differences.
  - `utils/sanitize-differences.ts` — Sanitizes hook difference arrays, ensuring all values are JSON-serializable.
- **Server** (`packages/server/`) — Runs as a Node.js process. Accepts WebSocket connections from the client, persists render reports to JSONL files, and exposes them via MCP tools over stdio.
  - `ws.ts` — WebSocket server with EADDRINUSE graceful handling. Also handles `relay-pause`/`relay-resume` events from non-owner MCP instances and broadcasts them to browser clients.
  - `io.ts` — Socket.io server instance management (singleton).
  - `relay-client.ts` — Socket.io client that non-owner MCP instances use to relay commands (pause/resume) to the owner's WS server. Connection is lazy (created on first relay call) and persists for the process lifetime.
  - `pause-state.ts` — Server-side pause state enforcement. Tracks pause state independently from the client, so the server can reject renders while paused even if the client connection is lost.
  - `store/` — Three main stores: `RenderStore` (JSONL-backed render data), `SnapshotStore` (JSON-backed named snapshots), and `ProjectRegistry` (in-memory project metadata — tracked components, WDYR config, HMR timestamps). Uses value dictionary deduplication (xxhash-wasm) to keep JSONL files compact.
  - `tools/` — One file per MCP tool: `get-renders`, `get-render-summary`, `get-commits`, `get-renders-by-commit`, `get-tracked-components`, `get-projects`, `clear-renders`, `pause-renders`, `resume-renders`, `save-snapshot`, `list-snapshots`, `compare-snapshots`, `delete-snapshot`, `wait-for-renders`.
- **Types** (`packages/types/`) — Shared type definitions including `RenderReport`, `SafeReasonForUpdate`, `StackFrame`, `StackFrameLocation`, and socket.io event contracts. Private package, not published to npm.

### Design Decisions

- **JSONL over SQLite** — Render data is ephemeral and the access pattern is simple (append, read all, filter, clear). JSONL avoids native addon dependencies (better-sqlite3) and migration complexity while supporting concurrent multi-process read/write.
- **Value dictionary deduplication** — Render reports often contain identical `prevValue`/`nextValue` objects across thousands of entries (e.g. the same prop object causing repeated re-renders). To avoid JSONL files growing to hundreds of MB, each file's first line is a content-addressed dictionary (`@@dict`) mapping xxhash-wasm h64 hashes to unique values. Render lines reference dictionary entries via `@@ref:<hash>` sentinel strings instead of inlining the full value. Only object/array values are dehydrated; primitives stay inline. On read, `readJsonl` transparently hydrates refs back to actual values, so consumers are unaffected. The dictionary is rewritten on each flush (acceptable because deduplication keeps files small).
- **No daemon process** — Instead of a separate long-running daemon managing shared state, each MCP instance is independent. The WS server is opportunistically claimed by whichever instance starts first; data sharing happens through the filesystem. Commands that require WS access (pause/resume) are relayed to the owner via a socket.io client connection.
- **Project ID from `location.origin`** — The browser's origin is used as the project identifier because it's auto-available (zero config for the user) and unique per dev server. The MCP server doesn't need to know the project ID upfront — tools query the JSONL store and disambiguate as needed.
- **One file per function** — Tools and utilities are split into individual files (`tools/<tool-name>.ts`, `store/utils/<fn-name>.ts`) for clarity. Each file has a single responsibility.
- **Commit ID via DevTools hook** — React calls `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` once per commit, synchronously. The client patches this hook to increment a counter, and WDYR's notifier (called during render phase) reads the current counter value. Since React guarantees `commitRoot → next renderRoot` ordering, renders within the same commit share the same ID. If the hook doesn't exist at init time, the client creates a minimal stub so React will call into it.
- **Stack trace capture via `Error` objects** — On each render update, the client creates a new `Error()` to capture the call stack. `parseStack` uses `error-stack-parser` to extract frames, then filters out React reconciler internals (~50+ function names), WDYR internals, and known noise files (`react-dom`, `scheduler`, `installHook`, etc.). Each surviving frame is classified as `"hook"` or `"component"` based on naming convention (`use*` → hook). Source map resolution (`@jridgewell/trace-mapping`) maps bundled locations back to original source files. Stack frames are only included in `RenderReport` when non-empty, keeping payloads lean for renders where capture fails or yields no useful frames.
- **Render batching** — The client sends renders in batches (`render-batch` event) rather than individually, reducing WebSocket overhead when many components re-render in the same React commit.
- **HMR detection** — The client patches both Vite (`import.meta.hot`) and webpack (`module.hot`) HMR hooks to emit `hmr` events to the server. The `ProjectRegistry` records HMR timestamps per project, allowing `wait_for_renders` to know when the browser has applied a code change and new renders are expected.
- **Server-side pause enforcement** — Pause state is tracked on the server (`pause-state.ts`) independently from the client. This ensures renders are rejected even if the client connection is lost and re-established while paused.
- **Snapshot store** — Snapshots are stored as individual JSON files in `~/.wdyr-mcp/snapshots/` (one file per snapshot name). JSON was chosen over JSONL because snapshots are small, point-in-time captures that are read/written atomically.

## Tech Stack

- **Runtime**: Node.js 20+ (server), Browser (client)
- **Language**: TypeScript (strict mode)
- **Build**: tsdown (per-package config — server ESM for Node, client ESM+CJS for browser)
- **Package Manager**: pnpm (workspace monorepo)
- **Linter/Formatter**: Biome (spaces, recommended rules)
- **Protocol**: MCP SDK (`@modelcontextprotocol/sdk`), WebSocket (`ws`)
- **Storage**: JSONL files (`~/.wdyr-mcp/renders/`) with value dictionary deduplication; JSON files (`~/.wdyr-mcp/snapshots/`) for named snapshots
- **Hashing**: xxhash-wasm (WASM, no native addons)
- **Release**: multi-semantic-release (independent versioning per package)

## Commands

- `pnpm build` — Build all packages
- `pnpm dev` — Watch mode build for all packages
- `pnpm check` — Lint and format check (Biome)
- `pnpm check:fix` — Auto-fix lint and format issues
- `pnpm typecheck` — TypeScript type check across all packages
- `pnpm test` — Run tests across all packages

## Project Structure

```
packages/
├── types/                          # @why-did-you-render-mcp/types (private, not published)
│   └── src/
│       └── index.ts                # Shared types (RenderReport, socket.io events, etc.)
├── client/                         # @0x1f320.sh/why-did-you-render-mcp-client
│   ├── tsdown.config.ts
│   └── src/
│       ├── index.ts                # Browser client (WS + sanitization + HMR detection)
│       └── utils/
│           ├── describe-value.ts   # Complex value serialization (React elements, DOM, etc.)
│           ├── parse-stack.ts      # Error stack → StackFrame[] parser
│           ├── resolve-source-map.ts # Source map resolution (trace-mapping)
│           ├── sanitize-differences.ts # Hook difference sanitization
│           └── sanitize-reason.ts  # WDYR UpdateInfo.reason serialization
└── server/                         # @0x1f320.sh/why-did-you-render-mcp
    ├── tsdown.config.ts
    └── src/
        ├── index.ts                # Entry point (MCP + WS server init)
        ├── io.ts                   # Socket.io server instance management
        ├── ws.ts                   # WebSocket server (EADDRINUSE handling)
        ├── pause-state.ts          # Server-side pause state enforcement
        ├── relay-client.ts         # Socket.io client for relaying commands to WS owner
        ├── store/
        │   ├── index.ts            # Store exports + singletons (store, snapshots, registry)
        │   ├── render-store.ts     # RenderStore class (JSONL-backed)
        │   ├── snapshot-store.ts   # SnapshotStore class (JSON-backed)
        │   ├── project-registry.ts # ProjectRegistry class (tracked components, config, HMR)
        │   ├── types.ts            # StoredRender, RenderWithProject, ComponentSummary, Snapshot
        │   └── utils/
        │       ├── read-jsonl.ts   # JSONL file parser (dict-aware)
        │       ├── sanitize-project-id.ts
        │       ├── summarize.ts    # Render aggregation into ComponentSummary
        │       ├── to-result.ts    # StoredRender → RenderWithProject
        │       └── value-dict.ts   # xxhash-wasm dehydrate/hydrate
        └── tools/
            ├── index.ts            # registerTools barrel
            ├── get-renders.ts      # All renders (with stack traces)
            ├── get-render-summary.ts # Renders grouped by component (with durations)
            ├── get-commits.ts      # List React commit IDs
            ├── get-renders-by-commit.ts # Renders for a specific commit
            ├── get-tracked-components.ts # Currently tracked components
            ├── get-projects.ts     # Active projects list
            ├── save-snapshot.ts    # Save current render summary as named snapshot
            ├── list-snapshots.ts   # List saved snapshots
            ├── compare-snapshots.ts # Compare two snapshots (per-component diff)
            ├── delete-snapshot.ts  # Delete a snapshot by name
            ├── wait-for-renders.ts # Wait for renders after HMR, with timeout
            ├── clear-renders.ts    # Clear stored render data
            ├── pause-renders.ts    # Pause render collection (direct or relayed)
            ├── resume-renders.ts   # Resume render collection (direct or relayed)
            └── utils/
                ├── resolve-project.ts # Auto-select or disambiguate project
                └── text-result.ts  # MCP text response helper
```

## Git Workflow

- **All PRs targeting `dev` must be squash merged.** Do not use merge commits or rebase merges.
- **PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/).** Examples: `feat: add render timeline tool`, `fix: handle null displayName`, `refactor: extract ws reconnect logic`.
- **Issue titles must be written in natural language describing the objective.** Examples: "Support filtering renders by hook type", "Server crashes when client sends malformed JSON". Do not use conventional commit prefixes in issue titles.
