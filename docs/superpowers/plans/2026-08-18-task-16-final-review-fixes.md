# Task 16 Final Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 Phase B 终审提出的本地 secrets 接线、现状文档刷新、无消费者类型文件清理与 404 路由注释，并生成验证报告和单一提交。

**Architecture:** 根 npm 脚本继续作为开发/部署入口，实际服务由 `workers/api` 中的 Rust Worker 与 Askama SSR 提供，浏览器交互由 `islands/` 中的 vanilla TypeScript islands 提供。本批只调整配置、文档和注释，不改变运行时行为。

**Tech Stack:** Node.js 22、Wrangler 4.100.0、TypeScript、ESLint、Vitest、Rust、workers-rs、Askama。

## Global Constraints

- `dev` 必须从仓库根目录的 `.dev.vars` 加载本地 secrets。
- README 与 AGENTS 只描述单 Rust Worker + vanilla islands 现状，不保留 Next.js/OpenNext 现状描述。
- 删除 `cloudflare-env.d.ts`；若有引用则修复引用，不保留无消费者声明。
- 路由 fallback 行为不变，只说明它是非 `/` 路径的 catch-all 404 承载点。
- 使用 Node.js 22 运行全部 Node 验证。
- 只创建一个提交，提交信息固定为 `chore: dev secrets wiring, docs refresh and route comment (final review fixes)`，不添加 `Co-Authored-By`。

---

### Task 1: 本地 secrets 与现状文档

**Files:**
- Modify: `package.json`
- Modify: `AGENTS.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: `workers/api/wrangler.jsonc`、根目录 `.dev.vars`、`npm run assets`。
- Produces: 与实际单 Worker 架构一致的 `dev`、`deploy` 使用说明。

- [x] **Step 1: 验证 Wrangler flag**

Run:

```bash
PATH=/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH npx wrangler --version
PATH=/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH npx wrangler dev --help
```

Expected: 版本为 `4.100.0`，帮助中包含 `--env-file`。

- [x] **Step 2: 修改脚本与文档**

将 `package.json` 的脚本设为：

```json
"dev": "cd workers/api && wrangler dev --env-file ../../.dev.vars",
"deploy": "npm run assets && cd workers/api && wrangler deploy"
```

将 README 的技术栈与本地开发命令改为 Rust Worker、Askama SSR、vanilla TypeScript islands、Tailwind、CodeMirror、Vitest、Cloudflare Workers/D1 的实际组合；AGENTS 只保留 `workers/api` 与 `islands/` 两行现状说明。

### Task 2: 类型清理与路由注释

**Files:**
- Delete: `cloudflare-env.d.ts`
- Modify: `workers/api/src/routes/mod.rs`

**Interfaces:**
- Consumes: `pages::home::render_page` 对非 `/` 路径返回 404 的既有行为。
- Produces: 无遗留 `CloudflareEnv` 声明；显式记录 catch-all 404 设计意图。

- [x] **Step 1: 确认声明无消费者并删除**

Run:

```bash
rg -n "cloudflare-env\\.d\\.ts|CloudflareEnv" --glob '!node_modules/**'
```

Expected: 仅 `cloudflare-env.d.ts` 自身命中；随后删除该文件。

- [x] **Step 2: 记录路由 fallback 语义**

在 fallback 前加入：

```rust
// `home::render_page` returns 404 for non-root paths, making this the catch-all 404.
```

不改变 `.unwrap_or(pages::home::render_page)`。

### Task 3: 全量验证、报告与提交

**Files:**
- Create: `.superpowers/sdd/2026-08-18-rust-ssr-phase-b/task-16-fix-report.md`

**Interfaces:**
- Consumes: Tasks 1–2 的最终工作树。
- Produces: 新鲜验证证据、末行 `DONE` 的报告和指定提交。

- [x] **Step 1: 运行全部验证**

Run:

```bash
PATH=/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH npx tsc --noEmit
PATH=/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH npx eslint .
PATH=/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH npx vitest run
cd workers/api && cargo test
git diff --check
```

Expected: 所有命令退出码为 0；测试零失败；diff 无空白错误。

- [x] **Step 2: 写报告并核对需求**

报告记录 Wrangler 版本/flag 选择、每项改动、全部验证结果、保留的既有工作树改动，并以独立一行 `DONE` 结尾。

- [x] **Step 3: 按路径暂存并提交**

Run:

```bash
git add package.json AGENTS.md README.md workers/api/src/routes/mod.rs cloudflare-env.d.ts docs/superpowers/plans/2026-08-18-task-16-final-review-fixes.md
git add -f .superpowers/sdd/2026-08-18-rust-ssr-phase-b/task-16-fix-report.md
git diff --cached --check
git commit -m "chore: dev secrets wiring, docs refresh and route comment (final review fixes)"
```

Expected: 一个无 `Co-Authored-By` 的提交；既有 `task-6-report.md` 修改不在暂存区。
