# Rust 道场 · Rust Dojo

> 调用 Rust Playground 真实编译运行的中文 Rust 后端实战学习平台——而且整站本身就是用 Rust 写的。

**线上**：https://rust-dojo.pp-account.workers.dev

从 0 到可就业的 Rust 后端学习路径：8 个模块、60 道判题练习、4 个本地实战项目（43 条验收清单）、25 条求职资源。课程按 2026 年真实 JD 调研设计（云后端 tokio/axum/sqlx 方向）。

这个站的叙事是「Rust 站 Rust 写」：全部页面由一个 **workers-rs Worker** 服务端渲染（askama 模板），浏览器侧只有无框架的 vanilla TypeScript islands——没有 React，没有 Next.js，没有任何前端框架运行时。

## 架构总览

```
浏览器
 ├─ SSR HTML ◀── Worker rust-dojo（workers-rs / wasm）
 │                ├─ askama 模板（workers/api/templates/）
 │                ├─ pulldown-cmark 服务端渲染课程/题面 markdown（GFM）
 │                ├─ /api/*：OTP 认证、进度、AI 代理（D1 + KV + MAIL service binding）
 │                └─ Workers Assets（assets-dist/：css、islands js、字体、图标）
 ├─ islands（vanilla TS，esbuild esm splitting，共享 chunk 单例 store）
 │    ├─ exercise：CodeMirror 6 + 判题 + AI 助教
 │    ├─ fx：全套动效（打字终端/count-up/模块阶梯/跑马灯/magnetic/reveal）
 │    └─ theme / login / me / checklist / progress-*
 └─ 判题：浏览器直连 play.rust-lang.org/execute（CORS 开放，无自建沙箱）
```

三条设计主线：

1. **判题不经过服务器**。编辑器里的代码直接从浏览器打官方 Rust Playground，真实 rustc 编译运行。三种判题模式（stdout 逐行比对 / compile / 隐藏测试），外加两种加固：compile 题可带 `expectedStdout` 输出比对（堵"空 main 也能过"），`assertSource` 把编译期签名断言追加到提交末尾（堵"改签名绕过题目要求"，如 `const _SIG: for<'a> fn(&'a str, &'a str) -> &'a str = longest;`）。
2. **内容以 TypeScript 为唯一事实源**（`content/`），构建期经 `scripts/gen-manifest.mjs` 生成 JSON，Rust `include_str!` 编译期内嵌。vitest 守卫保证内容与生成物永不漂移；`solutionCode` 被排除式生成器 + 多重断言挡在客户端载荷之外。
3. **判题/进度逻辑零分叉**。`lib/rust/{judge,playground,normalize}.ts` 与 `lib/progress/*` 是零框架纯 TS，islands 经 esbuild 直接打包原文件——从 React 时代迁移到 islands，这些核心逻辑一行没改。

## 功能

- **60 道练习**：全部经 `PLAYGROUND_TESTS=1 npm run test:soundness` 真打 Playground 实测（答案必过、starter 必挂、compile 题空 main 必挂）
- **邮箱 OTP 登录**：无状态 HMAC 会话（`rdsess` cookie），login_codes 限次限频
- **进度系统**：local-first localStorage + 登录后与 D1 并集合并；练习与项目验收清单共用进度命名空间
- **AI 助教**：DeepSeek 代理（提示/解释/调错三动作，KV 日限流），苏格拉底式引导不给完整答案
- **双主题**：暗色默认，`data-theme` 切换持久化；全站与旧 React 版像素级一致（迁移验收 0.00~0.02%）

## 仓库布局

```
workers/api/          Rust Worker（唯一部署单元，wrangler.jsonc name=rust-dojo）
  src/core/           纯逻辑（会话/进度/限流/AI 载荷……），native cargo test
  src/routes/         API glue（D1/KV/MAIL/DeepSeek）
  src/pages/          页面 handler + site-content 反序列化与 markdown 预渲染
  templates/          askama 模板（base/topbar + 一页一文件）
  tests/              集成测试（渲染断言、判题数据岛守卫）
islands/              浏览器侧 vanilla TS（esbuild 入口；_ 前缀=共享片段）
lib/                  零框架 TS：判题层与进度层（islands 复用）；auth/session.ts 供测试向量生成
content/              课程/练习/项目/资源（事实源）+ 守卫测试
scripts/              gen-manifest / gen-expected / gen-session-vectors / build-site-assets / parity-smoke
assets-dist/          构建产物（gitignore）：site.css、islands js、字体、图标
migrations/           D1 迁移
docs/superpowers/     Next→Rust 迁移的设计 spec 与实施计划（含 Phase A/B 全记录）
```

## 本地开发

前置：Node 22（`nvm use 22`）、Rust 工具链 + `wasm32-unknown-unknown` target、`.dev.vars`（三枚 secrets：`SESSION_SECRET` / `MAIL_API_SECRET` / `DEEPSEEK_API_KEY`）。

```bash
npm install
npm run dev        # wrangler dev（自动加载 .dev.vars），单 Worker 本地起服
npm run assets     # Tailwind v4 CLI + esbuild + 字体/图标 → assets-dist/（含自检）
```

内容改动后必须重新生成（vitest 有守卫，忘了会红）：

```bash
node scripts/gen-manifest.mjs          # → workers/api/{manifest,site-content}.json
node scripts/gen-expected.mjs --compile m1-05   # stdout/compile 题重生成期望输出
```

## 测试

```bash
npx vitest run                          # TS 全量（内容守卫/islands/判题层，174 条）
cd workers/api && cargo test            # Rust（core 单测 + 页面渲染集成，52 条）
cargo clippy --target wasm32-unknown-unknown --all-targets
PLAYGROUND_TESTS=1 npm run test:soundness   # 61 条，串行真打 Playground（慢，改题后必跑）
node scripts/parity-smoke.mjs <baseUrl>     # 12 条无副作用 API 契约断言（--against 双目标 diff）
```

会话兼容有跨语言测试向量：`scripts/gen-session-vectors.mjs` 用 TS 实现签发 fixture，Rust `core::session` 逐条对拍——保证 HMAC 会话格式两侧字节兼容。

## 部署

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"
npm run deploy     # = npm run assets && cd workers/api && wrangler deploy
```

注意事项、secrets 管理、回滚三档、已知坑位见 **STATUS.md**（运维事实源）。要点：build 命令内的 `worker-build@0.1.14` 与 `wasm-bindgen = "=0.2.105"` 是 worker 0.6 的成对兼容线，勿单独升级；wrangler exit 144 非失败。

## 迁移史（Next.js → Rust）

本站 2026-07 以 Next.js 16 + OpenNext 上线，2026-08 分两阶段迁移到纯 Rust：

- **Phase A**：7 个 API 端点迁到 workers-rs（会话字节兼容，存量 cookie 无感）
- **Phase B**：全部页面按批切流迁到 askama SSR + islands（B0 资源页 → B1 学习/项目 → B2 首页动效/登录 → B3 编辑器页 → B4 退役 Next），每批过五道验收门：react-dom/server 真渲染逐节点对拍、双视口×双主题像素 diff（全站 0.00~0.02%）、交互 E2E、双侧测试全绿、回滚演练

完整设计与执行记录在 `docs/superpowers/`。

## License

MIT © YSKM523
