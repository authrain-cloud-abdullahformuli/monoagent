<div align="center">

<img src="logo.svg" alt="MonoAgent" width="128" height="128" />

# MonoAgent

### *One File. Infinite Agency.*

**浏览器原生的单文件自主 AI 智能体工作台。**

[![HTML](https://img.shields.io/badge/single--file-HTML-ff6b35?style=flat-square)](monoagent.html)
[![Zero Build](https://img.shields.io/badge/build-none-00ff88?style=flat-square)](#getting-started)
[![BYOK](https://img.shields.io/badge/keys-BYOK-5b8af5?style=flat-square)](#configuration)
[![License](https://img.shields.io/badge/license-MIT-aa66ff?style=flat-square)](LICENSE)
[![CI](https://github.com/authrain-cloud-abdullahformuli/monoagent/actions/workflows/ci.yml/badge.svg)](https://github.com/authrain-cloud-abdullahformuli/monoagent/actions/workflows/ci.yml)

[English](README.md) &nbsp;|&nbsp; **简体中文**

[在线体验](https://authrain-cloud-abdullahformuli.github.io/monoagent) &nbsp;&middot;&nbsp; [一键部署](#deploy) &nbsp;&middot;&nbsp; [使用配置](#configuration)

</div>

---

打开一个 HTML 文件，即可获得一个可联网、可编程、可扩展的完整 AI 智能体——多轮对话、工具调用、浏览器内 Python 沙箱、网页检索、技能系统、上下文压缩、长期记忆、文件操作、云端同步以及多智能体蜂群协作，全部在一张自包含的页面中运行。

> **没有后端，没有 `npm install`，没有 Docker。** 一张 `.html`，自带完整的智能体宇宙。

---

## 预览

![MonoAgent Preview](https://jsd.onmicrosoft.cn/gh/mydracula/image@master/20260421/188f31edc79848ff9ed581bc3b5339ff.png)

---

## Highlights

| 能力 | 说明 |
|---|---|
| **单文件部署** | `monoagent.html` 放入任意静态主机或本地双击即可在现代浏览器中运行 |
| **多 LLM 供应商** | 纯客户端直连 Anthropic / OpenAI / DeepSeek / Ollama / Gemini 及兼容接口，支持自定义 Endpoint；BYOK 密钥仅保存在本地 |
| **推理程度控制** | 顶栏内联选择器，对齐 OpenAI `none / low / medium / high / xhigh / max` 六档（另有 Auto） |
| **长上下文压缩** | 每模型独立 context window，接近上限时自动通过 LLM 进行摘要压缩 |
| **长期记忆** | 跨会话持久保留事实 / 偏好 / 事件 / 技能，自动提取 + Agent 工具调用 + 手动增删，标签与关键词检索 |
| **MCP 服务器** | 粘贴 `mcpServers` JSON 即可导入（`streamable_http` / `sse`），支持 Bearer 鉴权与 CORS 代理 |
| **Plan Mode** | Agent 先只读调研，生成 Markdown 计划供审批，获得用户确认后才执行操作 |
| **Ralph Loop** | 无人值守的 continue-until-done 循环模式，支持完成标记、最大/无限迭代、手动中止与无进展保护 |
| **Sub-agents** | 委派有边界的只读调研任务，并在侧栏监控运行状态 |
| **Agent Swarm** | 并行蜂群多智能体协作：lead 一轮内发出多个 `SwarmSpawn`，按角色（researcher / critic / writer / coder）并发执行 |
| **Human-in-the-loop** | Agent 可在需要用户判断时请求输入文本、多项选择或确认 |
| **实时任务列表** | 可视化 `TodoWrite` 面板展示待办、进行中与已完成任务 |
| **生命周期 Hooks** | 支持在 6 个核心生命周期阶段注入用户自定义 JavaScript 钩子 |
| **Python 沙箱** | 基于 Pyodide WebAssembly，在浏览器内安全执行 Python 代码 |
| **远程沙箱** | 可选的隔离运行环境（Daytona / WebContainers），适用于重度代码任务 |
| **网络搜索** | 内置 Tavily 搜索引擎，支持 `basic` 与 `advanced` 深度检索模式 |
| **技能系统** | 支持安装 `.skill` / `.zip` 扩展包、从 GitHub 导入、页面内可视化编写，或让 AI 自主调用 `SkillManager` 动态管理 |
| **会话管理** | 多会话管理、文件夹分类、拖拽排序、IndexedDB 存储与一键 JSON 导出 |
| **云端同步** | 支持将状态增量同步到任意 S3 兼容对象存储（AWS / Cloudflare R2 / MinIO / Backblaze B2），支持端到端 AES-256-GCM 加密 |

---

## 快速上手

### 1. 克隆仓库

```bash
git clone https://github.com/authrain-cloud-abdullahformuli/monoagent.git
cd monoagent
```

### 2. 启动工作台

双击 `monoagent.html` 直接在浏览器打开，或通过本地静态服务器启动：

```bash
npx serve .
# 或
python3 -m http.server 8000
```

访问 `http://localhost:8000/monoagent.html`，点击顶栏 **Settings** 配置 Provider / API Key / 模型，保存后即刻生效。

> **安全与隐私提示**：自带的 `sw.js` 仅用于离线 PWA 缓存。所有大模型与网络检索请求均为浏览器通过 BYOK 凭据直连，无任何中间服务器或信息收集。

---

## 测试与质量验证

```bash
node test-regressions.js
```

---

## 一键部署

MonoAgent 为纯静态网页，可免费部署在任何静态托管平台：

<div align="center">

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fauthrain-cloud-abdullahformuli%2Fmonoagent&project-name=monoagent&repository-name=monoagent)
&nbsp;
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/new)
&nbsp;
[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://dash.cloudflare.com/?to=/:account/pages/new)

</div>

---

## 作者与维护者

**Abdullah Formuli**
- GitHub: [@authrain-cloud-abdullahformuli](https://github.com/authrain-cloud-abdullahformuli)
- 邮箱: authrainmedia@gmail.com

---

## 开源协议

本项目采用 [MIT License](LICENSE) 授权。
