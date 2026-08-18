# Task 13 (B3) 报告：/exercise/[id] Rust SSR

**状态**：DONE。`/exercise/[id]` 已由 Rust + Askama 完成 SSR，题面、导航和 Playground 初始 DOM 与现网 TSX 对齐，既有 `exercise` island 只在练习页加载。

## 1. manifest 与 Rust 内容模型

- `scripts/gen-manifest.mjs` 继续采用排除式变换：保留 exercise 的所有非判题公开字段，删除 `solutionCode`，把
  `judgeMode / expectedStdout / hiddenTests / assertSource / crateType` 收进每题必有的 `judge` 子对象。
- `content/manifest-sync.test.ts` 的期望值仍从 `allExercises` 整体派生；守卫覆盖 judge 存在、五个 judge 键不留在顶层、
  `solutionCode` 在条目与整份生成物中都不存在。
- 已用 Node 22 重跑 `node scripts/gen-manifest.mjs`，生成的 `workers/api/site-content.json` 含 60 道练习、60 个 judge 子对象、
  0 个顶层 judge 键、0 个 `solutionCode`。
- Rust `content.rs` 新增完整 exercise/judge 反序列化字段，并在 OnceLock 初始化时预渲染题面 Markdown；集成测试分别验证
  stdout 题的 expectedStdout 与 tests 题的 hiddenTests/crateType。

## 2. /exercise/[id] SSR

- 新增 `pages/exercise.rs` 与 `templates/exercise_detail.html`，逐节点移植 `app/exercise/[id]/page.tsx`、
  `EditorialPanel`、`LessonView`、`Playground` 初始 DOM、hints details、AI idle 状态和 `ExerciseNavBar`。
- `#exercise-data` 仅序列化协议字段；可选字段按题目实际数据省略，starterCode 来自 site-content，`</` 统一转义为 `<\/`。
  专项单测覆盖 script 提前闭合防护。
- `[data-exercise-editor]` 是严格空容器；运行文案使用 `[data-exercise-run-label]`；AI 按钮无 `type`；初始模板不输出
  `data-exercise-dynamic`、debug 按钮、运行结果、错误、AI 回复或任何空占位节点。
- 上下题序列按 `content/exercises/index.ts::exerciseNav` 相同语义在服务端计算：仅在同模块 exercise 顺序中取前后题，
  首尾渲染禁用文本，中间链接直接 SSR；回模块链接包含模块内 1-based index/total。
- `PAGE_ROUTES` 注册 `/exercise`，页面 renderer 只 strip 一次 `/exercise/`；未知/重复前缀均走既有 HTML 404。
  Topbar 传 `active="learn"`，与 `Topbar.tsx` 的 `/exercise` 前缀高亮“学习路线图”一致。
- base 新增可选 `page_scripts` block，`exercise.js` 只由 exercise 模板注入，避免非练习页下载约 494 KB 的 CodeMirror bundle。

## 3. TDD 与验证

- manifest 守卫先在旧扁平结构上出现 2 个预期失败，再经生成器改造变为 8/8 通过。
- Rust judge 测试先因 `Exercise` 无 `judge` 字段编译失败；exercise SSR 测试先因模块不存在编译失败；非练习页 bundle
  回归测试先因 base 全局加载失败。三轮均已完成 RED → GREEN。
- `cargo test`：21 个 unit + 29 个 integration + 0 doc failures。
- `cargo clippy --target wasm32-unknown-unknown --all-targets`：exit 0，无 error。
- Node 22 `npm run assets`：自检 33/33；`exercise.js` 存在、无 React，共享 progress chunk 保持。
- Node 22 `npm test`：47 files passed / 1 skipped；210 tests passed / 61 skipped。
- 定向 ESLint：0 error；仅 `scripts/gen-manifest.mjs` 既有未使用参数 `exportNames` 的 1 条 warning。
- `wrangler dev` 真实 Worker：GET `/exercise/m1-01` = 200，HEAD = 200，title、`#exercise-data`、island、空编辑器挂载点、
  run label、下一题链接存在，且无 `solutionCode` / `data-exercise-dynamic`；GET `/exercise/nope` = HTML 404。
  HEAD 同时确认 `Cache-Control: private, no-store` 与 `Vary: Cookie`。

## 4. 自决与环境说明

- 现有 base 原先全局加载轻量 islands；exercise bundle 含 CodeMirror，按 Task 12 的“只影响练习路由”结论改为 page block 局部加载。
- Wrangler 首次启动会写只读 `~/.wrangler`，其 build hook 又会重复 `cargo install` 写只读 `~/.cargo`。验收时先用仓库固定的现有
  `worker-build` 生成同一 `build/worker/shim.mjs`，再使用 `/tmp` 等价配置（只移除重复 build hook）及 Wrangler 官方
  `WRANGLER_LOG_PATH` / `WRANGLER_REGISTRY_PATH` 覆盖完成本地 HTTP 验证；仓库配置未改。
- 工作区原有 `.superpowers/.../task-6-report.md` 变更，以及执行期间出现的 `package.json` / `package-lock.json` 变更均未修改、
  未纳入本任务提交；本任务严格按路径显式暂存。

DONE

# Task 13 审阅修复

## 修复内容

- `exercise_detail.html` 的 rotate-ccw 第一条 path 已按仓库 `lucide-react@1.27.0` 真值改为 `M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`；`content.rs` 使用包含两条 path 的完整 SVG 字面量守卫。
- `escape_inline_json_for_script` 改为对序列化结果执行 `.replace('<', "\\u003c")`。既有 `</script><p>` 测试同步到统一转义结果，并新增 `<!-- <script` 输入，断言输出没有裸 `<`。
- `content.rs` 新增接线级测试：渲染 `/exercise/m1-01`、提取 `#exercise-data` 文本并断言没有裸 `<`。
- island 协议和客户端代码未改动。

## TDD 证据

- helper RED：`cargo test inline_json_contains_no_bare_less_than_characters` 因旧实现仍输出裸 `<` 失败。
- SVG RED：`cargo test --test content exercise_page_renders_title_prompt_data_island_editor_and_navigation` 因模板仍含旧 path 失败。
- `/exercise/m1-01` 接线测试在 RED 阶段即通过，因为当前该题序列化字段本身不含 `<`；该断言仍作为将来内容或接线变化的路由级守卫。
- 最小实现后，`cargo test inline_json`、SVG 聚焦测试和接线测试全部通过。

## 最终验证

- `cd workers/api && cargo test`：22 unit、30 integration、0 doc failure。
- `cargo clippy --target wasm32-unknown-unknown --all-targets`：exit 0，无 error。
- `rustfmt --edition 2021 --check src/pages/exercise.rs` 与 `git diff --check`：通过。
- `worker-build --release`：wasm release 构建及 wasm-opt 成功。
- Wrangler 4.100.0 本地 Worker：`GET /exercise/m1-01` 返回 200；为避开仓库 build hook 重复执行 `cargo install`，临时配置只移除 build hook，并沿用刚生成的 Worker 入口、assets 与全部绑定，仓库配置未改。
- `curl | node -e` 从真实响应抽取 `#exercise-data` 并执行 `JSON.parse`，证据：

```text
HTTP_STATUS=200
{"jsonParse":"ok","id":"m1-01","judgeMode":"stdout","bareLessThan":false,"canonicalRotatePath":true}
```

- 全仓 `cargo fmt --check` 仍会报告本任务之外的既有格式差异：`src/core/ai.rs`、`code.rs`、`mod.rs`、`ratelimit.rs`、`session.rs`；这些文件未改动、未暂存。
- 工作区既有 `.superpowers/sdd/2026-08-18-rust-ssr-phase-b/task-6-report.md` 修改保持原样，不纳入本提交。

DONE
