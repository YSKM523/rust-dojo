# Task 6 Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正 Task 6 的两处 SSR 模板空白差异，并完成 tier 兜底与页面脚手架去重清理，保持现有路由行为。

**Architecture:** Askama 模板直接消除两个动态文本前的源文件空白；learn view model 显式表示全部五种 tier，最终 `else` 仅负责未知值兜底。共享页面返回类型和 404 渲染集中在 `pages/mod.rs`，Worker GET/HEAD 页面路由由有序前缀表选择 handler。

**Tech Stack:** Rust 2021、Askama 0.14、Cloudflare Workers、Node.js 22、Wrangler 4。

## Global Constraints

- 不修改 `workers/api/templates/resource_detail.html` 的 `</svg>` 与 action label 之间空白。
- `lib/tier.ts` 的五个 badge class 是视觉事实源，模板 class 必须是完整静态字面量。
- 路由重构不改变 `/learn`、`/learn/*`、`/project/*`、`/resources*` 及其他页面路径的状态码和 HTML 404 行为。
- 提交信息固定为 `fix(workers/api): template whitespace parity, tier fallback guard and shared page scaffolding`，不加 `Co-Authored-By`。

---

### Task 1: SSR 空白与 tier class 回归测试

**Files:**
- Modify: `workers/api/tests/content.rs`

**Interfaces:**
- Consumes: `render_learn_index`、`render_learn_detail`、`render_project_detail`。
- Produces: 两处 `</span>` 紧接动态文字的断言，以及五个完整 badge class 字面量断言。

- [ ] **Step 1: 写失败测试**：断言 module exercise title 与 project checklist text 前不存在模板换行空白；循环断言以下 class：

```rust
for class in [
    "px-2 py-0.5 text-xs font-bold bg-emerald-700 text-white",
    "px-2 py-0.5 text-xs font-bold bg-sky-700 text-white",
    "px-2 py-0.5 text-xs font-bold bg-violet-700 text-white",
    "px-2 py-0.5 text-xs font-bold bg-amber-700 text-white",
    "px-2 py-0.5 text-xs font-bold bg-brand text-white",
] {
    assert!(html.contains(&format!("class=\"{class}\"")));
}
```

- [ ] **Step 2: 验证 RED**：在 `workers/api` 运行 `cargo test --test content template_dynamic_text_has_react_whitespace_parity -- --exact`，预期因当前 `</span>\n ...文字` 失败。
- [ ] **Step 3: 保留测试供后续 GREEN 验证**。

### Task 2: 模板空白与 tier 真兜底

**Files:**
- Modify: `workers/api/templates/project_detail.html`
- Modify: `workers/api/templates/module_detail.html`
- Modify: `workers/api/templates/learn_index.html`
- Modify: `workers/api/src/pages/learn.rs`

**Interfaces:**
- Consumes: Task 1 的 HTML 回归断言、`Module.tier_key`。
- Produces: `RoadmapCard.is_sprint: bool`，显式 sprint 分支和未知 tier 的最终 fallback。

- [ ] **Step 1: 最小空白修复**：把两个目标位置写成 `</span>{{ ... }}`，不触碰 resource 模板。
- [ ] **Step 2: 显式 sprint**：给 `RoadmapCard` 增加 `is_sprint`；`module_card` 计算它，`project_card` 设为 `false`。
- [ ] **Step 3: 未知值守卫**：在 `module_card` 用 `debug_assert!` 校验五种已知 key，并注释说明 release 下模板最终 `else` 仍按 sprint class 渲染，防止页面失去 badge。
- [ ] **Step 4: 模板分支**：在 senior 后增加 `{% else if card.is_sprint %}` 的 sprint span，最终 `{% else %}` 保留相同 sprint span作为未知值兜底。
- [ ] **Step 5: 验证 GREEN**：运行 Task 1 测试与 `cargo test --test content`，预期全部通过。

### Task 3: 共享页面脚手架与表驱动页面路由

**Files:**
- Modify: `workers/api/src/pages/mod.rs`
- Modify: `workers/api/src/pages/resources.rs`
- Modify: `workers/api/src/pages/learn.rs`
- Modify: `workers/api/src/pages/project.rs`
- Modify: `workers/api/src/routes/mod.rs`

**Interfaces:**
- Produces: `pages::RenderedPage`、`pages::render_not_found(Option<&str>)`、`PageHandler = fn(&str, Option<&str>) -> askama::Result<RenderedPage>`。

- [ ] **Step 1: 上提共享实现**：`pages/mod.rs` 定义 Askama `NotFoundTemplate`、公开 `RenderedPage` 和 `render_not_found`。
- [ ] **Step 2: 删除三份拷贝**：各页面模块 import 共享符号，保留各自 `render_page` 签名与现有匹配逻辑。
- [ ] **Step 3: 表驱动分派**：`routes/mod.rs` 定义有序 `PAGE_ROUTES`，遍历匹配 `/learn` 与 `/learn/`、`/project/`，未匹配继续调用 resources handler，保持原行为。
- [ ] **Step 4: 回归验证**：运行 `cargo test`，已有三组 prefix-once 与 404 测试必须全绿。

### Task 4: 验证、实证、报告与提交

**Files:**
- Create: `task-6-report.md`

- [ ] **Step 1: 静态验证**：运行 `cargo fmt --check`、`cargo test`、`cargo clippy --target wasm32-unknown-unknown --all-targets`。
- [ ] **Step 2: 资源验证**：用 Node 22 运行 `npm run assets` 并确认脚本自检成功。
- [ ] **Step 3: Worker 冒烟**：启动 `npx wrangler dev --port 8788`，curl `/project/p1`、`/learn/m1`、`/resources` 和三类 404；记录状态码与关键 DOM。
- [ ] **Step 4: 空白实证**：从 curl HTML 提取 `p1-01` 与 `m1-01` 对应片段，确认 `</span>` 紧接文字。
- [ ] **Step 5: 报告**：把变更、验证命令、HTML 片段写入 `task-6-report.md`，最后一行严格写 `DONE`；若任一硬门无法完成则写 `BLOCKED(原因)`。
- [ ] **Step 6: 提交**：检查 diff 后按明确路径 `git add`，用指定 message 提交，并确认提交不含 `Co-Authored-By`。
