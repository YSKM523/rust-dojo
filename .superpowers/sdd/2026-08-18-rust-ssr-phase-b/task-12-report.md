# Task 12 (B3) 报告：exercise island

**状态**：DONE。新增 `islands/exercise.ts`（无 `_exercise-*.ts` 共享片段——单文件够用，不为拆而拆）+ `islands/exercise.test.ts`。
判题 **零分叉复用** `lib/rust/judge.ts` / `lib/rust/normalize.ts` / `lib/progress/store.ts` 原文件（esbuild alias `@`），
components/ 一行未改，React 组件测试全部保留。

---

## 1. 移植对照（逐行为）

| 事实源 | 移植落点 | 备注 |
|---|---|---|
| `components/Playground.tsx` | `run()` / `changeCode()` / `reset()` / `aiStatus()` | 状态流转、`markCompleted(exercise.id)` 时机、`finally` 里复位 running 全部照搬 |
| `components/CodeEditor.tsx` | `createCodeMirrorEditor` | rust()、height 360px、**theme 写死 dark**、basicSetup 四项 |
| `components/VerdictBanner.tsx` | `verdictBanner()` | role=status / role=alert、类名、`reason ?? '结果与期望不一致'` |
| `components/RunOutput.tsx` | `runOutput()` / `outputBlock()` / `compilerOutput()` / `diffBlock()` / `findFirstDifferingLine()` | 含 RunOutput **组件内私有**的 `findFirstDifferingLine`（与 judge.ts 那份不是同一个，各自保留） |
| `components/AiCopilot.tsx` | `ask()` / `paintAi()` | 三动作、`errorMsg` 省略规则、loading 文案、错误/回复节点 |
| `components/ExerciseNavBar.tsx` | **不移植** | 纯 `<Link>` + lucide chevron，全部归 Task 13 模板 |

### 保真细节（容易做错、已逐条核对）
- `aiStatus` 推导式与 React 完全一致：`error || (result && !passed) → 'failed'`；`passed → 'passed'`；否则 `'idle'`。
- **AI 的 loading/reply/error 不随 run/reset/改码清空**——React 里 `AiCopilot` 不会被重新挂载，island 因此把 AI 三个 state 与判题四个 state 分开保管。真浏览器 fixture 专门断言了「重置后 AI 回复仍在」。
- `getError()` = `stderr || verdict.reason || ''`；`status==='passed'` 时 `errorMsg: undefined` → `JSON.stringify` 直接省略该键（fixture 断言 `!('errorMsg' in body)`）。
- `compilerOutput` / `diffBlock` 的类名保留 React 模板字面量的**行尾空格**（`"block min-h-6 "`），空行填 ` `，`data-highlighted` 只在命中行出现。
- 改码即清空判题结果（`changeCode`），因此 debug 按钮会随之消失——照 React。
- `foldGutter:false`、`crosshairCursor` 不启用（**@uiw 版 basicSetup 默认 false，与官方 `codemirror` 包的 basicSetup 不同**，这是最容易抄错的一处）。
- 扩展顺序按 `@uiw/react-codemirror@4.25` 实际装配复刻：`[updateListener, height theme, scrollerTheme, basicSetup(…), keymap(indentWithTab), oneDark, rust()]`。
- 重置走 `ExternalChange` annotation 的 dispatch，**不回灌 onChange**（等价 React 的 value prop 外部写入）。

---

## 2. 协议要点清单（Task 13 模板的接口文档）

完整协议在 `islands/exercise.ts` 文件头注释；下面是模板必须做到的硬约束：

1. **island 根**：`<div class="space-y-4" data-island="exercise">`（类名照搬 Playground.tsx 根节点）。
2. **内联 JSON**：`<script type="application/json" id="exercise-data">`，放 island 根内第一个子节点。
   字段仅 `id / judgeMode / starterCode / expectedStdout? / hiddenTests? / assertSource? / crateType?`——
   **`solutionCode` 绝不出现**（`title`/`prompt`/`hints` 也不需要进 JSON，它们由模板 SSR 直接渲染）。
   内容里的 `</` 必须转义成 `<\/`。已在真浏览器实测：该 `<script>` 在 `space-y-4` 里对布局零影响（section 偏移 0px vs 0px）。
3. **编辑器挂载点**：`<div class="cm-theme-dark" aria-label="Rust 代码编辑器" data-exercise-editor></div>`，
   外面套 `<div class="overflow-hidden border border-line bg-[#101217] font-mono">`。挂载点必须是**空**容器。
4. **按钮**：`[data-exercise-reset]`、`[data-exercise-run]`；运行按钮的文案必须包在
   `<span data-exercise-run-label>运行</span>` 里（React 那里是裸文本节点，island 需要可寻址节点；
   inline span 零像素差，与 checklist island 的 `[data-copy-idle]` 同一处理）。两个按钮模板**不带 disabled**。
5. **AI 副驾**（模板只输出 idle 初始态）：根 `[data-exercise-ai]`，按钮容器 `[data-exercise-ai-actions]`，
   两个按钮 `[data-exercise-ai-action="hint"|"explain"]`，各自内含 `<span data-exercise-ai-label>`。
   AI 按钮**不写 `type` 属性**（React 版就没有）。「为什么报错」按钮 / 错误 `<p>` / 回复 `<p>` 全部由 island 动态增删，模板不写。
6. **⚠️ 模板不要预留任何空占位节点**：运行出错框 / VerdictBanner / RunOutput 由 island 插在
   `[data-exercise-ai]` **之前**（无 AI 根则 append 到 island 末尾），带 `data-exercise-dynamic` 标记整体增删。
   根是 `space-y-4`，多一个空 `<div>` 就多 16px 间距。
7. **纯模板、island 不碰**：题面 md、`exercise.hints` 的 `<details>`、`ExerciseNavBar`。
8. island 只增删 `data-exercise-dynamic` / `data-exercise-ai-error` / `data-exercise-ai-reply` /
   debug 按钮四类节点，并改 `disabled` 与 `[data-exercise-*-label]` 的 `textContent`；其余 DOM 一概不动。
9. 用户文本一律 `textContent` 写入，无 HTML 插值。

---

## 3. 验证

**Node 22（`~/.nvm/versions/node/v22.22.2/bin`）**

- `npx tsc --noEmit`：0 error。`npx eslint islands/exercise.ts islands/exercise.test.ts`：0 问题。
- `npm run assets` 自检 **33/33 PASS**：`js/exercise.js` 产出且**无 react**；共享 chunk 仍只有一个
  （`chunks/chunk-7GU5CBNO.js`，1047 B = progress store），被 `checklist / exercise / me / progress-badge /
  progress-sync` **五个入口共同 import** → store 单例保持。
- `npx vitest run` 全量：**47 passed | 1 skipped（207 tests passed）**，含新增 `islands/exercise.test.ts` 8 例：
  运行成功（等待态→通过横幅→标准输出→store 写入）、运行失败（失败横幅 + 编译器信息行着色 + 期望/实际双栏 diff +
  高亮行 + 不写 store + debug 按钮出现 + 改码清空）、判题网络错误（运行出错框 + 无横幅 + status 转 failed）、
  重置、真 CodeMirror 挂载（cm-editor / cm-gutters / 无 foldGutter）、AI 三动作请求体 + 加载态三按钮禁用 +
  回复渲染 + 服务端错误分支、网络异常文案 + passed 时省略 errorMsg、缺 island/缺 JSON 时安全空转。
- **真浏览器 fixture**（playwright-core 1.60 + `chromium-1179`，`--no-sandbox`，node 静态服托 `assets-dist` +
  一张临时 fixture html，`page.route` mock 掉 `https://play.rust-lang.org/execute` 与 `/api/ai`；
  临时文件在 scratchpad，**不进仓**）：**23/23 PASS**——
  CM 挂载 / 行号 gutter / 无 foldGutter / 编辑器实测高 360px / oneDark 背景 `rgb(40,44,52)` / rust 高亮 span /
  **点进去能敲字** / 提交给 Playground 的正是编辑器内容且 `crateType=bin` / 通过横幅 + circle-check 图标 /
  标准输出块 / cargo 噪音已被 `stripCargoNoise` 剥掉（无编译器信息块）/ 动态节点位置在 AI 副驾之前 /
  `localStorage['rustdojo:completed'] === '["m1-01"]'` / hint 文案切「复盘本题」/ 无 debug 按钮 /
  AI 请求体 `status=passed` 且无 `errorMsg` / AI 回复渲染 / 重置恢复 starterCode / 重置清结果但保留 AI 回复 /
  无 pageerror。

---

## 4. 自决与疑虑（按「与现网行为一致」处理）

1. **编辑器主题不跟随 `data-theme`**。brief 允许二选一，`CodeEditor.tsx` 是写死 `theme="dark"` + 外层
   `bg-[#101217]`，island 照原样写死 oneDark。要改成跟随主题是产品决定，不是移植决定。
2. **`judgeExercise` 的类型转换**。内联 JSON 只有判题所需字段，缺 `moduleId/title/prompt/solutionCode`，
   而 `judgeExercise(ex: Exercise, …)` 要求完整 `Exercise`。judge 实际只读
   `judgeMode/hiddenTests/crateType/assertSource/expectedStdout`，故在**唯一一个边界处**做
   `judgeExercise as unknown as JudgeFn` 的转换，judge.ts 本身一字未改。
3. **编辑器做成可注入的 `EditorFactory`**。默认实现 `createCodeMirrorEditor`（导出，供 fixture/测试直接用）。
   jsdom 里真 CodeMirror 其实跑得起来（已有一例测试用真实现断言 gutters / 无 foldGutter），
   注入替身只是为了在单测里确定性地模拟「学员敲字」与断言重置写回。
4. **`<span data-exercise-run-label>` 与 AI label span 是新增 DOM**（React 那里是裸文本节点）。
   inline span 无样式、零像素差，且与 Task 6 checklist island 的 `[data-copy-idle]` 同一套处理逻辑。
5. **依赖声明遗留项（交给 B4）**：island 直接 import `@codemirror/{view,state,commands,language,search,autocomplete,lint,theme-one-dark}`，
   这些包目前只是 `@uiw/react-codemirror` / `codemirror` 的**传递依赖**（都已 hoist 到 `node_modules` 顶层且锁在
   `package-lock.json`，esbuild 解析正常，构建与运行都已实测通过）。本任务**刻意不动 `package.json` / lock**
   以免在切流前引入无关变更；**B4 删 `@uiw/react-codemirror` 时必须把它们提升为直接依赖**，否则重装依赖会缺包。
6. **产物体积**：`exercise.js` 494 KB（min）/ 163 KB（gzip），几乎全是 CodeMirror + lang-rust。
   现网 Next 版同样要下发这套 CodeMirror（外加 React），所以是持平偏优，没有回归。
   它只在 `/exercise/[id]` 一页加载，不影响其它路由。
7. **判题字段泄漏面**：`expectedStdout` / `hiddenTests` / `assertSource` 进内联 JSON —— 与 brief 一致，
   现网本就把它们发到客户端（Phase A 审计已记「非真保密」），**泄漏面持平不扩大**，`solutionCode` 仍不出现。
