# rust-dojo Phase B：Rust SSR + JS islands 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按批次把全部页面迁到 rust-dojo-api（askama SSR + islands），每批切流可回滚，终态退役 Next。

**Architecture:** 见 Spec。薄入口 `MIGRATED` 前缀表分流；同一 Rust Worker 承载 API+页面+Assets；islands 零分叉复用现有零框架 TS。

**Tech Stack:** askama、pulldown-cmark、Tailwind v4 CLI、esbuild、CodeMirror 6。

**Spec:** `docs/superpowers/specs/2026-08-18-rust-ssr-phase-b-design.md`

## Global Constraints

- **1:1 视觉**：模板从对应 TSX **逐节点移植**（读原文件，不默写）；Tailwind 类名原样照搬；模板内禁止动态拼接 Tailwind 类名。
- islands 不引入任何框架/运行时依赖；复用 `lib/rust/*.ts`、`lib/progress/*.ts` 原文件（esbuild alias `@` → 仓库根），不 fork 不改动它们。
- `<head>`、主题内联脚本、lang、data-theme 语义与 `app/layout.tsx` 逐字对齐。
- Rust：`cargo test` native 全绿；`cargo clippy --target wasm32-unknown-unknown --all-targets` 无 error；worker-build/wasm-bindgen pin 不动。
- 每批切流前过 Spec §7 的五道验收门；生产部署由编排者执行。
- vitest 全量必须始终绿（组件测试在 B4 前不许删）。
- git commit 不加 Co-Authored-By。

## 任务表（B0→B4 顺序执行；行为事实源=对应 TSX/TS 原文件）

### Task 1 (B0)：内容管线扩展（TS；opus）
**Files:** Modify `scripts/gen-manifest.mjs`；Create `workers/api/site-content.json`、扩展 `content/manifest-sync.test.ts`
**Produces:** site-content.json 契约：`{ modules:[{id,order,title,tierKey,tierLabel,summary,lesson}], exercises:[Exercise 全字段(含 prompt/starterCode/hints/difficulty/judgeMode，不含 solutionCode/hiddenTests/assertSource——防泄漏)], projects:[ProjectDef 全字段], resources:[Resource 全字段] }`；原 manifest.json 保持不变（两文件并存）。
Steps: 扩展生成脚本→跑通→守卫测试对 site-content 与内容深比较→vitest 全量→commit `feat: full site content manifest for Rust SSR`。
**注意**：resources 的类型定义读 `content/resources.ts`；Exercise 排除三个答案字段是硬要求（守卫测试断言这三个键不存在）。

### Task 2 (B0)：assets 构建管线 + 基础 islands（TS；opus）
**Files:** Create `scripts/build-site-assets.mjs`、`islands/theme.ts`、`islands/progress-badge.ts`、`islands/fx.ts`（本批仅 Reveal）、`assets-dist/`（产物，gitignore，构建生成）；Modify `package.json`（scripts.assets）、根 `.gitignore`（assets-dist）
**Produces:** `npm run assets` 一条命令产出 `assets-dist/{site.css,js/*.js,fonts/*}`。契约：css 入口复制 `app/globals.css` 为 `islands/site.css` 改造（@source 指 `workers/api/templates/**/*.html` 与 `islands/**/*.ts`；`--font-inter`/`--font-geist-mono` 改由 @font-face 提供，woff2 自托管 latin subset，fallback 栈照 globals.css）；esbuild bundle 每个 island 入口（format=esm，alias @→仓库根）。
theme.ts 移植 `components/ThemeToggle.tsx` 语义（localStorage rustdojo:theme、切 data-theme、按钮状态）；progress-badge.ts 移植 `components/ModuleProgressBadge.tsx`（订阅 `lib/progress/store.ts`，data-module-id 元素更新计数）；fx.ts 的 Reveal 移植 `components/fx/Reveal.tsx`（IntersectionObserver + reducedMotion）。
Steps: 写脚本→构建成功→node 冒烟（css 含 token 类、js 无 react 字样、fonts 就位）→vitest 全量→commit。

### Task 3 (B0)：Rust 页面骨架 + /resources 两页（Rust；codex）
**Files:** Modify `workers/api/Cargo.toml`（askama、pulldown-cmark，普通 dependencies——模板渲染是纯逻辑，native 可测）、`workers/api/wrangler.jsonc`（assets 配置 directory=`../../assets-dist`）、`src/lib.rs`、`src/routes/mod.rs`；Create `src/pages/mod.rs`、`src/pages/content.rs`（site-content.json 反序列化+OnceLock+md 预渲染）、`src/pages/resources.rs`、`workers/api/templates/{base.html,topbar.html,resources_index.html,resource_detail.html}`
**Produces:** GET /resources、/resources/[id] 返回与现网视觉一致的 SSR HTML。base.html 装配 `<head>`（照 `app/layout.tsx`：title/description/主题内联脚本/site.css/字体 preload）与 topbar；topbar.html 移植 `components/Topbar.tsx`；两页模板移植 `app/resources/page.tsx` 与 `app/resources/[id]/page.tsx`（含该页所有子组件）。
pulldown-cmark 开 GFM；渲染包进与 `components/LessonView.tsx` 相同的容器 class。
Steps: cargo test（content 解析+md 渲染单测）→clippy wasm→wrangler dev 本地 curl 两页断言 title 与关键 DOM→commit。
**注意** wrangler assets 与 Worker 路由共存：assets 命中优先；确认 /api/* 仍正常。

### Task 4 (B0)：切流+验收门+回滚演练（编排者）
worker-entry.mjs 加 `MIGRATED=['/resources']` 前缀分流逻辑→部署双 Worker→五道门（截图对比双视口×双主题、E2E 主题切换持久+徽章、parity-smoke 加页面断言、vitest+cargo、回滚演练一次）→ledger。

### Task 5 (B1)：/learn 两页（Rust；codex）
移植 `app/learn/page.tsx`、`app/learn/[moduleId]/page.tsx` 及子组件（ModuleCard、LessonView 容器、ExerciseList/ExerciseListClient 的 SSR 部分——完成态由 progress-badge/store 客户端标注，模板输出 data-exercise-id 供其上色）。lesson markdown 服务端渲染。Files: Create `src/pages/learn.rs`、templates `learn_index.html`、`module_detail.html`；islands 若需小胶水（列表完成态高亮）并入 `islands/progress-badge.ts` 扩展。验证同 Task 3。

### Task 6 (B1)：/project/[id] + checklist island（Rust+TS；codex）
移植 `app/project/[id]/page.tsx` + `components/{ProjectCard,ProjectChecklist}.tsx`。checklist.ts：勾选→`lib/progress/store.ts` markCompleted/unmark、进度条更新——DOM 结构与现网一致（role=progressbar 等）。验证：cargo/clippy/dev curl + esbuild 构建。

### Task 7 (B1)：切流+验收门（编排者）
MIGRATED += ['/learn','/project']；门：勾选刷新不丢（登录态跨端同步已在 Phase A 验过，本门验本地）、lesson markdown 渲染视觉、其余同 B0。

### Task 8 (B2)：fx 全量移植（TS；opus）
`islands/fx.ts` 补齐 HeroTerminal/ModuleLadder/Marquee/CountUp/Magnetic（+已有 Reveal），逐个移植 `components/fx/*.tsx`（时序、easing、reducedMotion 分支逐参数照搬）；挂载协议 data-fx="reveal|count-up|…" + data 参数。产出供 Task 9 模板使用的挂载文档（写进模板注释）。验证：esbuild 构建 + 本地 fixture html 手测每个动效触发。

### Task 9 (B2)：首页模板（Rust；codex）
移植 `app/page.tsx` 全部区块（hero/数据条/模块阶梯/跑马灯/CTA 等）+ fx 挂载点按 Task 8 协议。层级色经 `lib/tier.ts` 的类名完整写死在 site-content/模板（禁动态拼接）。验证同 Task 3 + 首页 DOM 断言。

### Task 10 (B2)：/login + /me（Rust+TS；codex）
移植 `app/login/page.tsx`（login.ts：两步 OTP 表单、错误展示、成功后 location.href='/me'——对照现网行为）、`app/me/page.tsx`（me.ts：读 store 渲染进度概览+登出按钮调 /api/auth/logout）。验证：dev curl + 构建。

### Task 11 (B2)：切流+验收门（编排者）
MIGRATED += 精确 `/` + ['/login','/me']；门重点：首页动效逐个人工核（我拍板）、登录全程 E2E（真 OTP+D1 取码）、/ 精确匹配不误吞其它路径。

### Task 12 (B3)：exercise island（TS；opus）
`islands/exercise.ts`：CodeMirror 6 原生装配（rust 高亮、主题跟随 data-theme）＋复用 `lib/rust/judge.ts` 判题→VerdictBanner/RunOutput DOM 更新（结构照 `components/{VerdictBanner,RunOutput,Playground}.tsx`）→通过后 markCompleted→hints details→AI copilot（移植 `components/AiCopilot.tsx`：三动作调 /api/ai、状态传递）。练习数据经页面内联 JSON（不含答案字段——Task 1 已保证 site-content 无泄漏，模板同样只输出安全字段+judge 所需 expectedStdout/hiddenTests？**注意**：判题在客户端需要 expectedStdout/hiddenTests——现网本就把它们发给客户端（Phase A 审计已记录"非真保密"），维持现状：模板内联 judge 字段，与现网泄漏面持平不扩大（solutionCode 仍不出现）。验证：esbuild 构建+fixture 手测。

### Task 13 (B3)：/exercise/[id] 模板（Rust；codex）
移植 `app/exercise/[id]/page.tsx`（题面 md SSR、EditorialPanel 布局、ExerciseNavBar 上下题导航——导航数据服务端算好内联）。site-content 需补 judge 字段：**回改 Task 1 生成器**加 `judge:{judgeMode,expectedStdout,hiddenTests,assertSource,crateType}` 子对象（守卫测试同步；solutionCode 仍必须排除）。验证同 Task 3。

### Task 14 (B3)：切流+验收门（编排者）
MIGRATED += ['/exercise']；门重点：真判题 E2E（正确答案过/starter 挂/空 main 挂）、AI 三动作、完成标记落 store+D1、CM 双主题渲染。

### Task 15 (B4)：主 Worker 变身与 Next 退役（Rust+TS；codex 主力）
worker-entry/主 wrangler 收敛：主 Worker 直接指向 rust worker 产物（或 entry 仅剩 API 转发的镜像简化——按实测最稳方案），assets 合并到 rust worker；删 `app/`（保 api？**删**——/api 已在 Rust）、`components/`、React/Next/OpenNext 依赖、`next.config.ts`、`open-next.config.ts`；vitest 配置调整：删组件测试，保 content/lib 测试（判题/进度 lib 仍被 islands 复用，测试保留）；`npm run deploy` 重定义。**这步破坏面大：先在分支充分验证，编排者部署。**

### Task 16 (B4)：收尾（编排者）
全站 parity-smoke+截图巡检、STATUS.md 重写部署拓扑、memory 更新、soak 清单合并。

## 验收门通用脚本约定
截图：Playwright chromium-1179（无头，`--no-sandbox`），1280×900 与 390×844，`data-theme` 两态各一张，与现网同页对比由编排者裁决。页面断言并入 `scripts/parity-smoke.mjs` 的新 `--pages` 模式（title+关键选择器）。
