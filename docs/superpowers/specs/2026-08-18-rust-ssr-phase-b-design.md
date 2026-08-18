# rust-dojo Phase B：Rust SSR + JS islands 逐页替换 Next 设计

日期：2026-08-18 ｜ 状态：设计已获用户批准（逐页渐进 + 1:1 视觉），随 "开始执行" 进入实施
前置：Phase A 已上线（/api/* 由 rust-dojo-api 服务，薄入口 worker-entry.mjs 在手）。

## 1. 目标与非目标

**目标**
- 全部页面由 `rust-dojo-api`（同一 workers-rs Worker）SSR：askama 模板 + pulldown-cmark + Workers Assets。
- **1:1 视觉与动效**：awwwards 层（cargo boot hero、模块阶梯、跑马灯、count-up、Magnetic、Reveal）、双主题、层级色全部保留；验收=双视口×双主题截图对比现网。
- **逐页渐进**：薄入口维护已迁移前缀表 `MIGRATED`，命中转 Rust，其余走 Next；每批可按单页回滚。
- 终态（B4）：Next/OpenNext/React 全部退役，内容 TS 与测试体系保留。

**非目标**
- 不改判题机制（浏览器直连 Playground）与 /api 行为（Phase A 已定）。
- 不改内容与教学结构；不引入前端框架（islands 是 vanilla TS）。
- 不做 Phase A soak 清理以外的顺手重构。

## 2. 架构

```
浏览器 → rust-dojo（worker-entry.mjs）
          ├─ /api/* 或 pathname ∈ MIGRATED 前缀 → env.API（rust-dojo-api）
          │     ├─ /assets/* → Workers Assets（wrangler assets 配置，先于 Worker 代码）
          │     └─ 页面路由 → askama SSR
          └─ 其余 → OpenNext handler（B4 移除）
```

- `MIGRATED` 是 worker-entry.mjs 顶部的字符串前缀数组；每批上线即向表里加前缀；回滚=删前缀重部署主 Worker。
- `rust-dojo-api` 的 wrangler.jsonc 增加 `assets: { directory: "assets-dist", binding: "SITE_ASSETS" }`；/assets/* 与图标等静态路径由 Assets 直接命中。

## 3. 内容管线

- 内容仍以 TS 为唯一事实源。`scripts/gen-manifest.mjs` 扩展为生成 `workers/api/site-content.json`：modules（含 lesson md）、exercises 全量（题面/starter/hints/难度/judge 元数据）、projects（brief md + checklist）、resources 全量。原 manifest.json（progressIds + AI 上下文）保持兼容或并入，二选一但守卫测试必须同步。
- Rust 侧 `include_str!` + OnceLock；markdown 用 pulldown-cmark（开 GFM tables/strikethrough）预渲染 HTML，包一层与现网相同的容器 class（照 LessonView 的 DOM 形状）。
- 防漂移：vitest 守卫同款（重生成 diff 必须一致）。

## 4. 模板与页面

- askama（.html 模板，JSX→HTML 移植最直接；Tailwind CLI 可扫）。组件化：base.html（<head> 元数据/主题内联脚本/字体/css）、topbar.html、页面模板一页一文件。
- `<head>` 逐字对齐现网：title/description、lang=zh-CN、data-theme 预设 + 主题内联脚本（localStorage rustdojo:theme，缺省 dark，加 fx-js class）、icon。
- 字体：Inter + Geist Mono 自托管 woff2（latin subset）进 assets/fonts，@font-face 提供 `--font-inter`/`--font-geist-mono` 同名变量，fallback 栈与 globals.css 一致。

## 5. Islands（vanilla TS + esbuild）

- 目录 `islands/`，esbuild 打包到 `assets-dist/js/*.js`，`<script type="module">` 挂载；数据经 `data-*` 属性或内联 JSON 传递。
- **零分叉复用**（esbuild 直接引用现有零框架 TS）：`lib/rust/{judge,playground,normalize}.ts`、`lib/progress/{store,merge,sync}.ts`、`lib/tier.ts`（如无 React 依赖）。
- 需要 vanilla 改写的胶水：theme.js（切换+持久）、fx.js（六个动效，IntersectionObserver/rAF，respect reducedMotion）、progress-badge.js（订阅 store 更新徽章）、checklist.js、login.js（OTP 两步）、me.js（本地进度渲染）、exercise.js（CodeMirror 6 原生 + 判题 + verdict/RunOutput + hints + AI copilot + 完成标记 + 题间导航）。
- CodeMirror 直接用 `codemirror`/`@codemirror/lang-rust`（现依赖树已有），去掉 @uiw React 包装。

## 6. CSS 管线

- Tailwind v4 standalone CLI：输入 globals.css（@import tailwindcss、@plugin typography、@custom-variant dark、全部 tokens 原样），`@source` 指向 `workers/api/templates/**` 与 `islands/**`，输出 `assets-dist/site.css`。
- 构建脚本 `scripts/build-site-assets.mjs`：tailwind + esbuild + 静态拷贝（fonts/icons），一条命令产出 assets-dist；wrangler deploy 前置调用。

## 7. 分批与切流

| 批 | 页面 | 新增 islands | 切流前缀 |
|---|---|---|---|
| B0 骨架 | /resources、/resources/[id] | theme、progress-badge、fx(Reveal 先行) | /resources |
| B1 | /learn、/learn/[id]、/project/[id] | checklist | /learn、/project |
| B2 | /、/login、/me | fx 全量(hero/ladder/marquee/count-up/magnetic)、login、me | /、/login、/me（/ 用精确匹配） |
| B3 | /exercise/[id] | exercise（CM6+判题+AI） | /exercise |
| B4 退役 | — | — | 表覆盖全站→主 Worker 直接成为 Rust Worker（assets 合并、删 Next/OpenNext/React 依赖与 app/components 渲染层，保留 content/ 与全部测试），STATUS/记忆收尾 |

每批验收门（全过才切流）：
1. 双视口(1280/390)×双主题截图 vs 现网同页对比（编排者拍板视觉裁决）
2. island 交互 E2E（该批相关：判题跑真题/勾选刷新不丢/登录全程/主题切换持久/动效触发）
3. parity-smoke 扩展：新增页面级断言（状态码/title/关键 DOM 选择器存在）双目标 diff
4. vitest 全量 + cargo test 全绿
5. 回滚演练在 B0 做一次（删前缀→重部署→现网回 Next 渲染）

## 8. 风险

- R1 pulldown-cmark 与 react-markdown 的 HTML 形状差异 → 截图验收兜底；必要时后处理对齐 class。
- R2 Tailwind CLI 扫 askama 模板的类名遗漏（动态拼接 class）→ 模板内禁止动态拼 Tailwind 类，层级色经 lib/tier.ts 的完整类名映射进 manifest。
- R3 / 精确匹配与其它前缀的路由冲突 → entry 用「精确 / + 前缀表」两段判断，B2 上线时专项测。
- R4 字体自托管的度量差异（next/font 有 size-adjust）→ 截图对比看行高/折行，必要时补 size-adjust 值。
- R5 esbuild 复用 lib/*.ts 时 TS path alias（@/）→ esbuild alias 配置对齐 tsconfig。
