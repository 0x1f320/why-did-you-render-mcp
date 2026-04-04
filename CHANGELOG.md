## [1.0.1-dev.1](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0...v1.0.1-dev.1) (2026-04-04)


### Bug Fixes

* retry WS server bind when owner instance exits ([#45](https://github.com/0x1f320/why-did-you-render-mcp/issues/45)) ([71334a6](https://github.com/0x1f320/why-did-you-render-mcp/commit/71334a676af310c0cf620854638cc621cdc8cbb4))

# 1.0.0 (2026-04-04)


### Bug Fixes

* **client:** preserve actual prevValue/nextValue in render reports ([#19](https://github.com/0x1f320/why-did-you-render-mcp/issues/19)) ([00833f9](https://github.com/0x1f320/why-did-you-render-mcp/commit/00833f921948af251fbfd7c34a07fb1ef4dc83be))
* filter React internals by name and resolve source maps in stack traces ([#41](https://github.com/0x1f320/why-did-you-render-mcp/issues/41)) ([19ede10](https://github.com/0x1f320/why-did-you-render-mcp/commit/19ede108c4a84daceb331e5244a4ac754928e46b))
* graceful shutdown and client reconnect resilience ([#20](https://github.com/0x1f320/why-did-you-render-mcp/issues/20)) ([f66d842](https://github.com/0x1f320/why-did-you-render-mcp/commit/f66d8425f11086e9090d83890458ab304573336c))
* include stackFrames in tool output and document in descriptions ([#43](https://github.com/0x1f320/why-did-you-render-mcp/issues/43)) ([77358da](https://github.com/0x1f320/why-did-you-render-mcp/commit/77358da49b0f2f92780f879f95c6e13b7e7b2bd3))
* **release:** reformat package.json after semantic-release version bump ([#30](https://github.com/0x1f320/why-did-you-render-mcp/issues/30)) ([6583358](https://github.com/0x1f320/why-did-you-render-mcp/commit/65833582a02a50efb4bfa292dba4c0901ee21840))
* sanitize render reason to prevent circular JSON serialization ([#5](https://github.com/0x1f320/why-did-you-render-mcp/issues/5)) ([2fe9ff1](https://github.com/0x1f320/why-did-you-render-mcp/commit/2fe9ff11777008ca1432d634a63aff093b5c0460))
* **server:** increase socket.io max buffer size to prevent disconnects ([#42](https://github.com/0x1f320/why-did-you-render-mcp/issues/42)) ([11a271c](https://github.com/0x1f320/why-did-you-render-mcp/commit/11a271c097737596d11782ac4fce899a5ea7de22))


### Features

* add get_tracked_components tool ([#36](https://github.com/0x1f320/why-did-you-render-mcp/issues/36)) ([4deba42](https://github.com/0x1f320/why-did-you-render-mcp/commit/4deba42570702b6b79ea448679a88a5c02e4ac6a))
* **client:** add styled [WDYR MCP] console logging for WS events ([#26](https://github.com/0x1f320/why-did-you-render-mcp/issues/26)) ([e440820](https://github.com/0x1f320/why-did-you-render-mcp/commit/e440820f0acbb12c6507c5f48785c64805d4f211))
* **client:** sanitize React elements as structured react-node values ([#21](https://github.com/0x1f320/why-did-you-render-mcp/issues/21)) ([4433f33](https://github.com/0x1f320/why-did-you-render-mcp/commit/4433f334f9ce76591ff7110add139d2f0ca1f53c))
* parse notifier stack trace to extract hook chain and component tree ([#40](https://github.com/0x1f320/why-did-you-render-mcp/issues/40)) ([9e7f2e7](https://github.com/0x1f320/why-did-you-render-mcp/commit/9e7f2e70746fc5a85ef6e6d09696520a9b7af921))
* pass WDYR options through buildOptions and expose config via get_tracked_components ([#38](https://github.com/0x1f320/why-did-you-render-mcp/issues/38)) ([c7354b1](https://github.com/0x1f320/why-did-you-render-mcp/commit/c7354b17f733e4f53ec59e3dfff0e6b150ecd77e))
* **server:** add component filter to get_renders_by_commit tool ([#28](https://github.com/0x1f320/why-did-you-render-mcp/issues/28)) ([bcbd83b](https://github.com/0x1f320/why-did-you-render-mcp/commit/bcbd83b2e1ba16e57deb9c4c9f0b5eba18e8f728))
* **server:** add heartbeat-based client liveness check ([#14](https://github.com/0x1f320/why-did-you-render-mcp/issues/14)) ([59fc671](https://github.com/0x1f320/why-did-you-render-mcp/commit/59fc6710609401dafd4c1cb5eeff1f12ebfc6c93))
* **server:** add React commit ID tracking and per-commit MCP tools ([#17](https://github.com/0x1f320/why-did-you-render-mcp/issues/17)) ([2aa7e10](https://github.com/0x1f320/why-did-you-render-mcp/commit/2aa7e106ec366c09a63750ec695b11bc03737422))
* **server:** multi-instance MCP + multi-project render data ([bbfc0ea](https://github.com/0x1f320/why-did-you-render-mcp/commit/bbfc0eae22729f1858b26515b5be3f380ddaa360))
* **tools:** add component and beforeCommit filters to clear_renders ([#35](https://github.com/0x1f320/why-did-you-render-mcp/issues/35)) ([0244223](https://github.com/0x1f320/why-did-you-render-mcp/commit/02442230fb153e51b5d4169dd4a27da2d9cd2a2e))
* **tools:** add get_commits tool with timestamp and component metadata ([#33](https://github.com/0x1f320/why-did-you-render-mcp/issues/33)) ([415a84f](https://github.com/0x1f320/why-did-you-render-mcp/commit/415a84ff9f11b7bbbb848cb5cc4e02d3692e9e5f))
* **tools:** add groupBy option to get_render_summary ([#29](https://github.com/0x1f320/why-did-you-render-mcp/issues/29)) ([56261b3](https://github.com/0x1f320/why-did-you-render-mcp/commit/56261b3388fac811efd572a6024b6937af192ddd))
* **tools:** add reason breakdown to render summary ([#34](https://github.com/0x1f320/why-did-you-render-mcp/issues/34)) ([34e6790](https://github.com/0x1f320/why-did-you-render-mcp/commit/34e679005256ac93aae8440efa0691768cb75a2b))


### Performance Improvements

* **client:** batch render reports per commit via microtask debounce ([#18](https://github.com/0x1f320/why-did-you-render-mcp/issues/18)) ([98a8b26](https://github.com/0x1f320/why-did-you-render-mcp/commit/98a8b2607722124d7438cfabd87ab64bf74682a0))
* **server:** deduplicate JSONL values with content-addressed dictionary ([#22](https://github.com/0x1f320/why-did-you-render-mcp/issues/22)) ([1af337e](https://github.com/0x1f320/why-did-you-render-mcp/commit/1af337ea8830cc6d3eab1140e2b054324b8de604))
* **store:** debounce JSONL writes by batching renders per project ([#13](https://github.com/0x1f320/why-did-you-render-mcp/issues/13)) ([d04ce13](https://github.com/0x1f320/why-did-you-render-mcp/commit/d04ce1396c8054b37996ee92a196e084663d423f))

# [1.0.0-dev.23](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.22...v1.0.0-dev.23) (2026-04-04)


### Bug Fixes

* include stackFrames in tool output and document in descriptions ([#43](https://github.com/0x1f320/why-did-you-render-mcp/issues/43)) ([77358da](https://github.com/0x1f320/why-did-you-render-mcp/commit/77358da49b0f2f92780f879f95c6e13b7e7b2bd3))

# [1.0.0-dev.22](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.21...v1.0.0-dev.22) (2026-04-04)


### Bug Fixes

* **server:** increase socket.io max buffer size to prevent disconnects ([#42](https://github.com/0x1f320/why-did-you-render-mcp/issues/42)) ([11a271c](https://github.com/0x1f320/why-did-you-render-mcp/commit/11a271c097737596d11782ac4fce899a5ea7de22))

# [1.0.0-dev.21](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.20...v1.0.0-dev.21) (2026-04-04)


### Bug Fixes

* filter React internals by name and resolve source maps in stack traces ([#41](https://github.com/0x1f320/why-did-you-render-mcp/issues/41)) ([19ede10](https://github.com/0x1f320/why-did-you-render-mcp/commit/19ede108c4a84daceb331e5244a4ac754928e46b))

# [1.0.0-dev.20](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.19...v1.0.0-dev.20) (2026-04-04)


### Features

* parse notifier stack trace to extract hook chain and component tree ([#40](https://github.com/0x1f320/why-did-you-render-mcp/issues/40)) ([9e7f2e7](https://github.com/0x1f320/why-did-you-render-mcp/commit/9e7f2e70746fc5a85ef6e6d09696520a9b7af921))

# [1.0.0-dev.19](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.18...v1.0.0-dev.19) (2026-04-04)


### Features

* pass WDYR options through buildOptions and expose config via get_tracked_components ([#38](https://github.com/0x1f320/why-did-you-render-mcp/issues/38)) ([c7354b1](https://github.com/0x1f320/why-did-you-render-mcp/commit/c7354b17f733e4f53ec59e3dfff0e6b150ecd77e))

# [1.0.0-dev.18](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.17...v1.0.0-dev.18) (2026-04-04)

# [1.0.0-dev.17](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.16...v1.0.0-dev.17) (2026-04-04)


### Features

* **tools:** add get_commits tool with timestamp and component metadata ([#33](https://github.com/0x1f320/why-did-you-render-mcp/issues/33)) ([415a84f](https://github.com/0x1f320/why-did-you-render-mcp/commit/415a84ff9f11b7bbbb848cb5cc4e02d3692e9e5f))

# [1.0.0-dev.16](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.15...v1.0.0-dev.16) (2026-04-04)


### Features

* **tools:** add component and beforeCommit filters to clear_renders ([#35](https://github.com/0x1f320/why-did-you-render-mcp/issues/35)) ([0244223](https://github.com/0x1f320/why-did-you-render-mcp/commit/02442230fb153e51b5d4169dd4a27da2d9cd2a2e))

# [1.0.0-dev.15](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.14...v1.0.0-dev.15) (2026-04-04)


### Features

* **tools:** add reason breakdown to render summary ([#34](https://github.com/0x1f320/why-did-you-render-mcp/issues/34)) ([34e6790](https://github.com/0x1f320/why-did-you-render-mcp/commit/34e679005256ac93aae8440efa0691768cb75a2b))

# [1.0.0-dev.14](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.13...v1.0.0-dev.14) (2026-04-04)


### Features

* add get_tracked_components tool ([#36](https://github.com/0x1f320/why-did-you-render-mcp/issues/36)) ([4deba42](https://github.com/0x1f320/why-did-you-render-mcp/commit/4deba42570702b6b79ea448679a88a5c02e4ac6a))

# [1.0.0-dev.13](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.12...v1.0.0-dev.13) (2026-04-04)


### Features

* **tools:** add groupBy option to get_render_summary ([#29](https://github.com/0x1f320/why-did-you-render-mcp/issues/29)) ([56261b3](https://github.com/0x1f320/why-did-you-render-mcp/commit/56261b3388fac811efd572a6024b6937af192ddd))

# [1.0.0-dev.12](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.11...v1.0.0-dev.12) (2026-04-04)


### Bug Fixes

* **release:** reformat package.json after semantic-release version bump ([#30](https://github.com/0x1f320/why-did-you-render-mcp/issues/30)) ([6583358](https://github.com/0x1f320/why-did-you-render-mcp/commit/65833582a02a50efb4bfa292dba4c0901ee21840))

# [1.0.0-dev.11](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.10...v1.0.0-dev.11) (2026-04-04)

# [1.0.0-dev.10](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.9...v1.0.0-dev.10) (2026-04-04)


### Features

* **server:** add component filter to get_renders_by_commit tool ([#28](https://github.com/0x1f320/why-did-you-render-mcp/issues/28)) ([bcbd83b](https://github.com/0x1f320/why-did-you-render-mcp/commit/bcbd83b2e1ba16e57deb9c4c9f0b5eba18e8f728))

# [1.0.0-dev.9](https://github.com/0x1f320/why-did-you-render-mcp/compare/v1.0.0-dev.8...v1.0.0-dev.9) (2026-04-04)


### Features

* **client:** add styled [WDYR MCP] console logging for WS events ([#26](https://github.com/0x1f320/why-did-you-render-mcp/issues/26)) ([e440820](https://github.com/0x1f320/why-did-you-render-mcp/commit/e440820f0acbb12c6507c5f48785c64805d4f211))
