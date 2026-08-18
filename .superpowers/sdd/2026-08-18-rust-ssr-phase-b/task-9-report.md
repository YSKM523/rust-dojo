# Task 9 (B2) 报告：首页 Rust SSR 模板

## 状态

首页 `/` 已从 `app/page.tsx` 逐节点移植到 Askama，六类 fx 挂载协议全部落地；根路由、全站
`fx.js`、首页蓝图资源和 HTML 404 兜底均已接通。

## 实现

- 新增 `workers/api/src/pages/home.rs` 与 `workers/api/templates/home.html`：完整覆盖 hero、JD
  关键词跑马灯、四项统计、Why Rust、8 模块阶梯、学习方式和 4 个精选资源区块。
- 首页数据取自 `site_content()` 的 OnceLock：模块、练习、项目统计保留 TSX 的“非空取真实长度，
  空数组才回退 8/60+/4”语义；阶梯使用 site-content 模块；精选资源按
  `featuredResourceIds` 的顺序查找。
- tier 色照 `lib/tier.ts` 和 `learn_index.html` 的 `is_*` 模式输出完整静态类名，模板没有动态拼接
  Tailwind class；beginner/intermediate/advanced/senior/sprint 五套 text/bar 字面值均有测试锁定。
- 六类 fx 按 `islands/fx.ts` 文件头协议挂载：
  - Reveal：11 个 `.fx-reveal[data-fx="reveal"]`，延迟参数按 TSX 原值；
  - CountUp：4 个挂载点，SSR 文本为终值，显式传 value/suffix/duration；
  - HeroTerminal：命令文本紧贴标签，两个日志行均为可见终态，无 SSR caret；
  - Magnetic：外层 data-fx、内层 `.fx-magnet`；
  - Marquee：两份完整行内容；
  - ModuleLadder：8 个直接行子元素、首行 active、完整 tier 数据属性，并新增像素中性的
    `[data-fx-ladder-index]` span。
- `base.html` 只新增一次 `/assets/js/fx.js`，因此全站加载。实测 `/resources` 没有 data-fx
  挂载点时仍正常 200，island 空跑无害。
- `PAGE_ROUTES` 显式加入 `/resources` 和 `/`；根条目使用 `path == "/"` 精确匹配，未匹配页面
  仍交给 home renderer 返回共享 HTML 404。这个显式 `/resources` 条目是 Wrangler 冒烟捕获并修复的
  回归：旧实现曾隐含依赖根 resources 兜底。
- `npm run assets` 现在也复制并自检 `public/hero-blueprint.webp`，否则 Wrangler 的首页图片会 404。
- Topbar 的首页 active 值为 `home`，与 `Topbar.tsx` 一致：三个导航链接都不亮，logo 保持普通链接态。

## TDD / 回归覆盖

实现前新增首页测试，当前根 renderer 返回 404，断言按预期红在 `status 404 != 200`；未知路径 404
测试从一开始就是绿色。实现后测试覆盖：title、全部关键区块、8 个模块行、四项统计、六类 fx、
terminal SSR 终态、tier 类、featured ID 顺序、`fx.js` 和 `/nope` HTML 404。

## 验证

- `cargo test`：20 个 unit + 25 个 content integration，45/45 通过；doc tests 通过。
- `cargo clippy --target wasm32-unknown-unknown --all-targets`：完成，无 error/warning。
- Node `v22.22.2` 下 `npm run assets`：31/31 self-check，通过；`fx.js` 5,206 B、无 React；
  `hero-blueprint.webp` 48,812 B。
- `npm test`：46 个 test files 通过、1 个跳过；199 tests 通过、61 跳过。
- `wrangler dev --port 8788 --local`：release wasm 构建成功；16/16 冒烟断言通过：
  - `/` → 200，含 title、hero、hero-terminal、module-ladder、`[data-fx-ladder-index]`、8 行模块、fx.js；
  - `/nope` → 404，含“页面不存在”，不含首页区块；
  - `/resources` → 200，无 data-fx 挂载点但加载 fx.js；
  - `/assets/js/fx.js` → 200；
  - `/hero-blueprint.webp` → 200，48,812 B。
- `git diff --check` 通过；首页模板动态 class 扫描通过；`base.html` 中 fx.js 引用计数精确为 1。

## 工作区说明

开始任务时已有 `.superpowers/sdd/2026-08-18-rust-ssr-phase-b/task-6-report.md` 未提交修改；该文件
属于用户/其他任务，本任务保留且不会暂存。提交只按 Task 9 路径显式 add。

DONE
