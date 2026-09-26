# AGENTS.md — Guidelines for Autonomous AI Agents

Welcome to **MonoAgent**, the browser-native autonomous AI agent workbench that lives entirely within a single HTML file (`monoagent.html`).

## Architecture & Principles
1. **Single-File Purity**: The entire application shell, Pretext layout engine, Markdown rendering, WebMCP bus, tools, sandbox integrations, and state management live in `monoagent.html`.
2. **Zero-Build, Zero-Backend**: MonoAgent requires no server build step or backend API daemon. It executes purely client-side in the browser using BYOK (Bring Your Own Key) for LLM providers.
3. **PWA & Offline Capability**: Managed by `sw.js` and `manifest.webmanifest`.
4. **Regressions & Quality**: Any structural edits or new tool integrations must pass `node test-regressions.js`.

## Verification Commands
- `node test-regressions.js`: Runs full VM-isolated regression tests against `monoagent.html` and `sw.js`.
- `npx serve .`: Serves static files locally for browser preview.
