# Task 6 审阅修复报告

## 变更

- `project_detail.html`：checklist id 的 `</span>` 与 item text 改为紧邻输出，消除 Askama 源模板换行产生的可见空格。
- `module_detail.html`：exercise 序号的 `</span>` 与 title 改为紧邻输出。
- `resource_detail.html`：未修改；action 图标与 label 的 React 原生空格保持不变。
- `learn_index.html` / `learn.rs`：新增 `is_sprint`，五种 tier 都有显式分支；最终 `else` 仅作为未知 tier 的 sprint 样式兜底。debug build 用 `debug_assert!` 及时暴露未知 tier，release 仍保证 badge 有完整样式。
- `pages/mod.rs`：集中 `RenderedPage`、`NotFoundTemplate`、`render_not_found`；`resources.rs`、`learn.rs`、`project.rs` 删除三份重复实现。
- `routes/mod.rs`：GET/HEAD 页面分派改为有序路径前缀与 handler fn 表遍历，resources handler 保持默认兜底。
- `tests/content.rs`：新增五个 `lib/tier.ts` badge 完整 class 字面量断言，以及两处动态文本空白 parity 回归断言。

## 验证

- `rustfmt --edition 2021 --check src/pages/{learn,mod,project,resources}.rs src/routes/mod.rs`：通过（仅核验本任务 Rust 路径，避免改写无关既有文件）。
- `cargo test`：通过，unit 20/20、content integration 18/18、doc 0 failure。
- `cargo clippy --target wasm32-unknown-unknown --all-targets`：通过，无 error。
- Node `v22.22.2` 执行 `npm run assets`：通过，自检 26/26。
- `wrangler dev --port 8788`：本地 Worker 编译和启动成功。
  - `/project/p1` → 200，包含“实战项目 P1 / 本地 cargo”。
  - `/learn/m1` → 200，包含“MODULE 1 / 小白”。
  - `/resources` → 200，包含“求职资料库”。
  - `/project/nope`、`/learn/nope`、`/resources/nope` → 均为 404，均渲染 HTML“页面不存在”。

## 空白修复实证

修后 `/project/p1` 渲染 HTML：

```html
<span class="mr-2 font-mono text-xs text-fg3">p1-01</span>用 cargo new 初始化 mini_grep，核心逻辑在 src/lib.rs、src/main.rs 只留薄薄一层，cargo run 能跑通
```

修后 `/learn/m1` 渲染 HTML：

```html
<span class="mr-2 text-fg3">1.</span>println! 与格式化占位符
```

DONE
