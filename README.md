<div align="center">

<img src="logo.svg" alt="MonoAgent" width="128" height="128" />

# MonoAgent

### *One File. Infinite Agency.*

**The browser-native autonomous AI agent workbench that lives in a single HTML file.**

[![HTML](https://img.shields.io/badge/single--file-HTML-ff6b35?style=flat-square)](monoagent.html)
[![Zero Build](https://img.shields.io/badge/build-none-00ff88?style=flat-square)](#getting-started)
[![BYOK](https://img.shields.io/badge/keys-BYOK-5b8af5?style=flat-square)](#configuration)
[![License](https://img.shields.io/badge/license-MIT-aa66ff?style=flat-square)](LICENSE)
[![CI](https://github.com/authrain-cloud-abdullahformuli/monoagent/actions/workflows/ci.yml/badge.svg)](https://github.com/authrain-cloud-abdullahformuli/monoagent/actions/workflows/ci.yml)

**English** &nbsp;|&nbsp; [简体中文](README.zh.md)

[Live Demo](https://authrain-cloud-abdullahformuli.github.io/monoagent) &nbsp;&middot;&nbsp; [Deploy Your Own](#deploy) &nbsp;&middot;&nbsp; [Configuration](#configuration)

</div>

---

Open one HTML file and you get a fully-featured, internet-aware, programmable, extensible AI agent — multi-turn chat, tool calls, in-browser Python sandbox, web search, skills, context compaction, long-term memory, file operations, cloud sync, and multi-agent swarm orchestration — all running in a single, self-contained page.

> **No backend. No `npm install`. No Docker required.** Just one `.html` file that carries an entire universe of agentic capabilities.

---

## Preview

![MonoAgent preview](https://jsd.onmicrosoft.cn/gh/mydracula/image@master/20260421/188f31edc79848ff9ed581bc3b5339ff.png)

---

## Highlights

| Capability | Description |
|---|---|
| **Single-File Deployment** | Drop `monoagent.html` on any static host or double-click to run locally in any modern browser. |
| **Multi-Provider LLM** | Direct client-side calls to Anthropic, OpenAI, DeepSeek, Ollama, Gemini, and OpenAI-compatible endpoints with custom URLs. BYOK keys remain 100% local. |
| **Reasoning Levels** | Inline selector supporting OpenAI `none / low / medium / high / xhigh / max` tiers (plus Auto). |
| **Long Context Compaction** | Per-model context window management with automated LLM-driven summary compression. |
| **Long-Term Memory** | Opt-in persistent facts, preferences, events, and skills stored in IndexedDB across sessions with auto-extraction and semantic tag/keyword search. |
| **MCP Servers (Model Context Protocol)** | Paste `mcpServers` JSON to import (`streamable_http` / `sse`), Bearer authentication, and optional CORS proxying. |
| **Plan Mode** | Agent investigates with read-only tools, drafts a Markdown plan for approval, and only acts upon explicit user confirmation. |
| **Ralph Loop** | Fully unattended continue-until-done loop with configurable completion markers, max/unlimited iterations, manual stop, and no-progress guards. |
| **Sub-Agents** | Delegate bounded read-only research tasks to secondary agent instances and monitor execution live in the side panel. |
| **Agent Swarm** | Parallel orchestrator-worker fanout: lead agent emits concurrent `SwarmSpawn` calls with role-scoped workers (researcher, critic, writer, coder) running with token budgets. |
| **Human-in-the-Loop** | Built-in interactive prompts allow agents to ask for text input, multi-choice selection, or approval when decisions arise. |
| **Interactive Task List** | Live `TodoWrite` tracker maintains a visible task progress board (pending / in-progress / completed). |
| **Lifecycle Hooks** | User-defined JavaScript handlers on 6 distinct agent lifecycle stages. |
| **Python Sandbox** | In-browser Python code execution powered by Pyodide WebAssembly. |
| **Remote Sandbox** | Optional isolated runtime (Daytona / WebContainers) for heavier execution tasks. |
| **Web Search** | Integrated Tavily search supporting `basic` and `advanced` deep-research modes. |
| **Skills System** | Install `.skill` / `.zip` packs, pull from GitHub, create in-page, or let the AI manage skills dynamically with `SkillManager`. |
| **Conversation Management** | Multi-session manager, folder categorization, drag-and-drop sorting, IndexedDB storage, and single-click JSON export. |
| **Cloud Sync** | Incremental synchronization to any S3-compatible bucket (AWS, Cloudflare R2, MinIO, Backblaze B2) with optional client-side AES-256-GCM encryption. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    monoagent.html                           │
│  ┌───────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐  │
│  │  UI Shell │  │  Chat /  │  │  Tools /   │  │  Skills  │  │
│  │ (3-column)│  │  Streams │  │  MCP Bus   │  │ Registry │  │
│  └─────┬─────┘  └────┬─────┘  └─────┬──────┘  └────┬─────┘  │
│        │             │              │              │        │
│  ┌─────┴─────────────┴──────────────┴──────────────┴─────┐  │
│  │          Pretext Layout Engine (inlined)             │  │
│  │  markdown → blocks → lines → flowed DOM              │  │
│  └──────────────────────────────────────────────────────┘  │
│        │                                                    │
│  ┌─────┴───────┐ ┌──────────────┐ ┌───────────┐ ┌────────┐  │
│  │ Service     │ │ LocalStorage │ │ Pyodide   │ │ S3     │  │
│  │ Worker      │ │ + IndexedDB  │ │ (Python)  │ │ SigV4  │  │
│  │ (PWA cache) │ │ (all state)  │ │           │ │ Client │  │
│  └─────┬───────┘ └──────────────┘ └───────────┘ └───┬────┘  │
└────────┼──────────────────────────────────────────────┼─────┘
         │                                              │
         ▼                                              ▼
  ┌──────────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────┐
  │  Anthropic   │  │  OpenAI    │  │  Tavily  │  │ Your bucket │
  │  DeepSeek    │  │  …         │  │          │  │ AWS/R2/MinIO│
  └──────────────┘  └────────────┘  └──────────┘  └─────────────┘
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/authrain-cloud-abdullahformuli/monoagent.git
cd monoagent
```

### 2. Launch the workbench

Simply double-click `monoagent.html` in your file explorer, or serve it using any local static server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Open `http://localhost:8000/monoagent.html` (or `http://localhost:3000`), click **Settings** in the top bar to configure your Provider, API Key, and Model. Everything takes effect immediately.

> **Privacy & Security Note**: The included `sw.js` is strictly a client-side PWA cache for offline use. All API requests are direct fetches from your browser to your configured provider using your BYOK credentials. No intermediary proxies, loggers, or backends exist.

---

## Testing & Verification

MonoAgent includes an automated regression test suite executing inside a Node.js VM context:

```bash
node test-regressions.js
```

---

## Skills System

Install skills from the left **Skills** panel via:
- **Marketplace**: Pre-curated JSON registry of community agent skills.
- **File Import**: Load `.skill` or `.zip` skill packages.
- **GitHub**: Paste any public GitHub repository or directory URL (e.g. `https://github.com/anthropics/skills/tree/main/skills/skill-creator`).
- **Create**: Write custom prompts, instructions, and tools directly in the browser.

Agents can also autonomously invoke `SkillManager` to install, inspect, toggle, or remove skills as needed.

---

## Agent Swarm

Enable multi-agent collaboration in **Settings → Agent Swarm**:
- **Fanout**: Lead agent issues multiple `SwarmSpawn(role, task)` commands in a single reasoning step.
- **Handoff**: Workers pass findings sequentially (e.g., `researcher → critic → writer`).
- **Blackboard**: Shared scratchpad memory (`bb_write`, `bb_read`, `bb_list`, `bb_claim`).
- **Custom Roles**: Define specialized sub-agents with dedicated system prompts, tool whitelists, and model overrides (e.g., run workers on lightweight models like Claude 3.5 Haiku while the lead runs on Claude 3.7 Sonnet).

---

## Deploy

MonoAgent is 100% static HTML, CSS, and JavaScript. Deploy anywhere for free:

<div align="center">

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fauthrain-cloud-abdullahformuli%2Fmonoagent&project-name=monoagent&repository-name=monoagent)
&nbsp;
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/new)
&nbsp;
[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://dash.cloudflare.com/?to=/:account/pages/new)

</div>

| Platform | Instructions |
|---|---|
| **GitHub Pages** | Fork or push to your repository → **Settings → Pages** → Source: **GitHub Actions**. Automatically deploys via the included workflow. |
| **Vercel** | Import Git repository → Framework: **Other** → Build Command: empty → Output Directory: `.` |
| **Cloudflare Pages** | Connect repository → Framework preset: **None** → Build output directory: `/` |

---

## Author & Maintainer

**Abdullah Formuli**
- GitHub: [@authrain-cloud-abdullahformuli](https://github.com/authrain-cloud-abdullahformuli)
- Email: authrainmedia@gmail.com

---

## License

This project is licensed under the [MIT License](LICENSE).
