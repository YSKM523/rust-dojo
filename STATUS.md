# rust-dojo STATUS

**Rust 道场** — 中文 Rust 后端实战学习平台（从 0 到可就业，按 2026-07 真实 JD 调研设计）。sql-dojo 的姊妹项目（架构同源）。

- **线上**: https://rust-dojo.pp-account.workers.dev （CF Worker via OpenNext）
- **部署**: `npm run deploy`（= opennextjs-cloudflare build && deploy；exit 144 非失败，看输出 URL）
- **绑定**: D1 `rust-dojo` (39bf19ae-6f2b-4ab9-8a91-20a2839fd8e5)、KV `RUST_DOJO_AI_RATELIMIT`、service binding `MAIL` → lakebbs-mail
- **Secrets**: SESSION_SECRET（独立生成）/ MAIL_API_SECRET / DEEPSEEK_API_KEY（后两个与 sql-dojo 同值；本地 `.dev.vars`）
- **判题**: 浏览器直连 play.rust-lang.org/execute（CORS `*`，无代理）；三模式 stdout/compile/tests；期望输出作者预生成（`scripts/gen-expected.mjs`），`npm run test:soundness`（PLAYGROUND_TESTS=1，串行打真实 Playground）守护答案不脱节
- **进度**: local-first localStorage `rustdojo:completed` + 登录 union merge 到 D1；项目验收清单项（p1-01…）与练习共用 progress 命名空间；cookie `rdsess`

## 当前状态（2026-07-26 全站收官）
- **内容全量上线：8 模块 60 道练习全部 soundness 实测**（每题答案必过 + starter 必挂/输出必异，`PLAYGROUND_TESTS=1 npm run test:soundness` 61 条断言 = 60 题 + 1 条守卫）；p1–p4 项目 brief + 43 条验收清单；求职资源 25 条（真实 Indeed 调研）
- 前端：awwwards 动效层（cargo boot hero、滚动模块阶梯、跑马灯、count-up、clip-reveal 语法，全部纯自建零依赖）；full-bleed 无侧边留白；**双主题**（暗=默认近黑蓝灰，亮=暖纸面，`dark:` 变体经 @custom-variant 跟随 data-theme）；多色系统（层级色 lib/tier.ts：小白绿/初级蓝/中级紫/高级琥珀/冲刺橙，数据条四色块）
- 线上 E2E 已验：prod 判题、OTP 登录（D1 取码）、进度落 D1；双主题 WCAG AA 测试覆盖（app/theme-contrast.test.ts）
- m7 注意：axum 不在 Playground top-100，练习用等价 handler 形状模型；真 axum 在 p4 项目

## 2026-08-19 Phase B 收官：全站单 Rust Worker（Next.js 已退役）

**线上拓扑**：单 Worker **`rust-dojo`**（workers-rs/wasm），askama SSR 全部页面 + vanilla islands（`islands/`，esbuild esm splitting 共享 chunk）+ Workers Assets（`assets-dist/`）。唯一部署配置 `workers/api/wrangler.jsonc`（name=rust-dojo）。Next/OpenNext/React 已从仓库删除（commit `d400046`）。判题机制未动（浏览器直连 Playground，`lib/rust/judge.ts` 被 islands 零分叉复用）。

**部署**：`export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"; npm run deploy`（= npm run assets && cd workers/api && wrangler deploy）。build 内含 `cargo install -q worker-build@0.1.14`——**会降级全局 worker-build**，与 `wasm-bindgen = "=0.2.105"` 成对锁定勿单独升级。exit 144 非失败。内容改动后先 `node scripts/gen-manifest.mjs`（vitest 有守卫）。

**secrets 真相**：三枚（SESSION_SECRET/MAIL_API_SECRET/DEEPSEEK_API_KEY）设在 Worker `rust-dojo`，**以 `.dev.vars` 为准**。历史坑：主 Worker 的 SESSION_SECRET 曾是 2026-07 上线时的另一版值（与 .dev.vars 分叉），2026-08-19 单 Worker 化时已同步并用真 cookie 复验。**重设 SESSION_SECRET = 全站 rdsess 失效、所有用户登出**。

**回滚三档**：
- A（秒级，首选）：`npx wrangler rollback <version-id> --name rust-dojo`（B3 末版 entry `5a03de87`）。**前提：Worker `rust-dojo-api` 还活着**（那版 service binding 指向它）——因此 rust-dojo-api 保留至 soak ≥1 周后再删。
- B（分支级）：`git revert d400046` → `npm install`（装回 Next）→ 旧式 opennextjs 部署。
- C（页面级 MIGRATED 前缀）：**已不存在**（薄入口随 Task 15 删除）。

**本地开发**：`npm run dev`（wrangler dev --env-file ../../.dev.vars，secrets 已接线）。测试：`npx vitest run`（174 条）+ `cd workers/api && cargo test`（52 条）+ `PLAYGROUND_TESTS=1 npm run test:soundness`（61 条，打真实 Playground）。

**已知坑位 / backlog**：
- 详情页尾斜杠（`/learn/m1/` 等）现为 404（Next 曾 308 重定向）；index 页尾斜杠 200 双 URL 无 canonical——SEO 侧如需对外绑域前处理。
- 全站 `Cache-Control: private, no-store`（页面含 SSR 登录态）——workers.dev 无边缘缓存故零回归；**绑自定义域前必须做匿名可缓存变体**。
- `lib/` 下死代码清单（auth/cookie、auth/useSession、progress/useProgress、db/d1、mail/send、ai/*——真实现已在 Rust 侧，留作 parity 文档源）；`lib/auth/session.ts` 是活的（gen-session-vectors 依赖）。
- islands/theme.ts 无单测（E2E 有实证）；raw HTML markdown 口径（Rust 转义 vs react-markdown 丢弃，现内容零命中）。
- 像素基线：全站与 Next 版 0.00~0.02%（残差全为字体度量/抗锯齿级，已逐一裁决），字体为 fontsource variable 自托管。

## 2026-08-17 教学层审计 + 加固（已改，未部署）
审计方式：Claude 与 codex（gpt-5.6-sol, effort high）各自独立通读代码后交叉验证，所有结论都实测核验过。

**已修**
- **进度同步丢数据（P0）**：`app/api/progress/sync/route.ts` 只用 `getExerciseById` 过滤上行 id，43 条项目验收清单 id（`p1-01`…）全被丢弃；客户端 `bootstrapSync` 拿回结果后 `setAll()` 全量覆盖 localStorage，而 `<ProgressSync/>` 挂在 `app/layout.tsx` 每次加载都跑 → 登录用户的项目清单勾选每刷新一次就被抹掉。修法是双层：① 新增 `lib/progress/ids.ts` 统一白名单（练习 + 清单共用进度命名空间），两个进度路由都改用它；② 客户端改成 `setAll(mergeIds(local, remote))`，对服务端过滤漂移免疫（`mergeIds` 早就写好了但一直没人调用）。
- **compile 题「空 main 也能过」（14 道全部堵上）**：判题层原本只看 `run.success`。现在 `compile` 题填了 `expectedStdout` 就同时比对输出；另新增 `Exercise.assertSource`，把编译期断言追加到提交末尾。9 道有输出的补 `expectedStdout`（`gen-expected.mjs` 加了 `--compile`），4 道无输出的补签名断言（m3-03/m3-08/m7-03/m7-06），m5-06 补一行打印后走输出比对。题面里 5 处「不比对输出」话术同步改掉。
- **m6-02 提示自相矛盾**：第 2 条 hint 说 `tokio::join!` 后要加 `.await`，与参考答案和第 3 条 hint 冲突，已改。
- **题数纠正**：实际是 **60 道**（9/9/9/9/7/7/6/4）。之前写的 61 是把 soundness 的**测试条数**（60 题 + 1 条守卫）当成了题数。

**守卫**：`content/integrity.test.ts` 新增「compile 题必须有 expectedStdout 或 assertSource 至少其一」；`content/soundness.test.ts` 的 compile 分支改成走判题同一路径（追加 assertSource + 比对输出），并新增「空 main 必挂」断言。`PLAYGROUND_TESTS=1 npm run test:soundness` 61/61 真实实测通过；全量 vitest 144 passed；tsc 干净；eslint 与改动前同基线（4 error/2 warning，全在既有文件）。

**已核验但未改（下一步候选）**
- `<Playground exercise={exercise}/>` 把整个 Exercise（含 `solutionCode` + `hiddenTests`）传进客户端，隐藏测试并非真保密。保持浏览器直连 Playground 就解决不了，只能叫「UI 未展示」。
- p1 挂 m2 之后却要求生命周期标注和 `Box<dyn Error>`（m3 才教）；p4 挂 m7 之后却要 tracing/Docker/CI（m8 才教）。
- m7-06 的跨层错误映射目前只有类型级断言，行为正确性没验证；要真验证得转成 `tests` 模式。
- **`play.rust-lang.org/clippy` 端点可直连**（POST body 同 `/execute`，`access-control-allow-origin: *`，实测能返回 `needless_range_loop`/`len_zero` 等惯用法警告）。这是没自建沙箱也能做「惯用法判题 / 重构题」的现成入口，尚未接入。
- 教学法欠缺（两边独立得出同一结论）：读懂 rustc 报错这项核心技能没被训练（题面提前把错误码和改法说完了）；没有间隔重复/主动回忆（进度只有 completed 布尔，没有尝试次数/错误码）；「补 TODO」和「本地从零做完整项目」之间缺中间台阶；没有代码审阅/重构题。

## 下一步（可选）
- 域名绑定（如要对外）；学习过程中按需补题/修题
- 内容创作协议（补新模块时用）：agent 只写 `content/exercises/moduleN.ts` + `content/modules/mN.lesson.ts`，index 注册由集成者做

## 坑
- wrangler.jsonc 里 D1/KV id 为空串会导致所有 wrangler 命令拒绝解析（连 `d1 create` 都跑不了）
- bootstrap 占位测试断言"内容为空"，每填一批内容都要同步改断言
- 练习 prompt 是 markdown，必须经 LessonView 渲染（直接 {exercise.prompt} 会露出 ### 和代码围栏）
