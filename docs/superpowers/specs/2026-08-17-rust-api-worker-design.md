# rust-dojo Phase A：API 层 Rust 化（rust-dojo-api Worker）设计

日期：2026-08-17 ｜ 状态：已获用户批准的设计，待实施计划
路线背景：用户选定「叙事：Rust 站就该 Rust 写」，留在 CF Workers，A→B 渐进。
本文只覆盖 Phase A；Phase B（Rust SSR + JS islands 替掉 Next）待 A 上线后单独设计。

## 1. 目标与非目标

**目标**
- `/api/*` 全部 7 个端点由新的 workers-rs Worker `rust-dojo-api` 服务。
- 行为与现网逐端点等价（parity）：状态码、JSON 形状、cookie、限流语义一致。
- 已登录用户的 `rdsess` cookie 无感存活（会话格式字节级兼容）。
- 一行改动可回滚。

**非目标（Phase A 明确不做）**
- 不动前端（React/CodeMirror/判题客户端/动效层原样）。
- 不动判题路径（仍是浏览器直连 play.rust-lang.org）。
- 不做 Rust SSR（Phase B）。
- 不删 Next 侧 API 路由文件（过渡期保留，soak 后另行清理）。

## 2. 架构

```
浏览器 ──同源──▶ Worker rust-dojo（main = worker-entry.mjs）
                    ├─ pathname 以 /api/ 开头 ──▶ env.API.fetch(原样 Request)
                    │                              └▶ Worker rust-dojo-api（workers-rs）
                    │                                   ├─ D1 DB / KV AI_RATELIMIT
                    │                                   ├─ service binding MAIL → lakebbs-mail
                    │                                   └─ fetch → DeepSeek API
                    └─ 其余 ──▶ OpenNext 生成的 handler（.open-next/worker.js）
```

- workers.dev 子域不支持跨 Worker 路径路由，因此分流在主 Worker 入口做。
- 转发传**原始 Request**（service binding 子请求保留全部头，含 `cf-connecting-ip`、cookie），
  同源不变，前端零改动。

## 3. 主 Worker 薄入口 `worker-entry.mjs`

- 新文件，`wrangler.jsonc` 的 `main` 从 `.open-next/worker.js` 改指向它。
- 逻辑仅两条：`/api/` 前缀 → `env.API.fetch(request)`；否则调 OpenNext handler 的 `fetch`。
- 必须 `export * from './.open-next/worker.js'` 转出附带导出（DO 类等，OpenNext 可能生成）；
  实施第一步先验证 `.open-next/worker.js` 的导出清单（已知风险 R1）。
- `wrangler.jsonc` 增加 `services: [{ binding: "API", service: "rust-dojo-api" }]`。

## 4. Rust crate 结构 `workers/api/`

```
workers/api/
├── Cargo.toml            # worker (d1 feature), serde, serde_json, hmac, sha2, base64
├── wrangler.jsonc        # name=rust-dojo-api；绑定见 §8
├── manifest.json         # 生成物，内容清单（§7）
├── src/
│   ├── lib.rs            # #[event(fetch)] 入口 + 路由分发（match method+path）
│   ├── core/             # 纯逻辑，不依赖 worker 类型，native 可编译 → cargo test 直接跑
│   │   ├── session.rs    # 签发/验签（§5）
│   │   ├── progress.rs   # id 白名单过滤、merge 语义
│   │   ├── ratelimit.rs  # 限流键与判定
│   │   └── ai.rs         # DeepSeek 消息构造（移植 lib/ai/prompts.ts）
│   ├── routes/           # 端点 glue：解析请求 → 调 core → D1/KV/MAIL/fetch
│   └── bindings.rs       # Env 访问封装
└── tests/                # 含 TS 生成的会话测试向量 fixtures
```

- 纯逻辑放 `core/`（无 wasm 依赖）是硬结构约束——保证 `cargo test` 在 native 跑，
  worker glue 保持薄。

## 5. 会话兼容（硬要求）

- 令牌格式：`b64url(JSON{uid,email,exp}) + "." + b64url(HMAC-SHA256(payloadB64, SESSION_SECRET))`，
  `exp` 为 epoch 毫秒。b64url 无 padding。与 `lib/auth/session.ts` 完全一致。
- Rust 必须能验签 TS 签发的存量 token（关键方向）；Rust 签发的新 token 只会被 Rust 自己验
  （TS 侧无 API 后不再读会话）。
- 验证手段：新脚本 `scripts/gen-session-vectors.mjs` 用现 TS 实现生成测试向量
  （有效/过期/篡改签名/坏 payload 各若干），写入 `workers/api/tests/fixtures/`，
  cargo test 断言逐条结果一致。
- Cookie 同名同属性：`rdsess; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=…`。

## 6. 端点清单（行为以现有 TS 路由为唯一事实源）

| 端点 | 行为要点（parity 必保） |
|---|---|
| POST /api/auth/request-code | 校验邮箱 → 写 login_codes → 经 MAIL binding 发信（`POST https://lakebbs-mail/send`，Bearer MAIL_API_SECRET） |
| POST /api/auth/verify | latestCode 取最新码、限尝试次数、consume、upsert user、签发会话、Set-Cookie |
| GET /api/auth/me | 验签 → `{user:{email}}` 或 401 语义与现网一致 |
| POST /api/auth/logout | 清 cookie |
| GET/POST/DELETE /api/progress | 白名单 `isKnownProgressId`（练习 + 清单共用命名空间）；D1 upsert/delete |
| POST /api/progress/sync | **保留 2026-08-17 修复语义**：`filterKnownProgressIds` 放行练习+清单 id，mergeProgress 并集后回传全量 |
| POST /api/ai | action ∈ {hint,explain,debug}；KV 日限 40/IP（键格式对齐 `lib/ai/ratelimit.ts`）；DeepSeek 经 `worker::Fetch`（不用 reqwest）；错误文案一致 |

实施时逐个对照 `app/api/**/route.ts` 与 `lib/{auth,db,ai,progress,mail}/`，
不凭本表默写。

## 7. 内容清单 manifest

- 新脚本 `scripts/gen-manifest.mjs`：从 TS 内容生成 `workers/api/manifest.json`：
  `{ progressIds: string[]（60 练习 + 43 清单）, exercises: { [id]: { title, prompt } } }`
  （exercises 供 AI 路由拼上下文）。
- Rust `include_str!` 编译期内嵌 + serde 解析（once_cell 缓存）。
- vitest 新增守卫：重新生成 manifest 与仓内文件 diff，必须一致——内容改了忘了重新生成
  就红，防漂移。

## 8. 绑定与 secrets（rust-dojo-api 的 wrangler.jsonc）

- D1 `DB`（39bf19ae-6f2b-4ab9-8a91-20a2839fd8e5）、KV `AI_RATELIMIT`（7f3db3d8…）、
  service `MAIL` → lakebbs-mail、var `DEEPSEEK_MODEL`。
- secrets（`wrangler secret put`，token 走 `~/.config/cloudflare/env`）：
  `SESSION_SECRET`、`MAIL_API_SECRET`、`DEEPSEEK_API_KEY`——与现网同值。
- 主 Worker（Next 侧）绑定过渡期**全部保留**，回滚即用。

## 9. 测试策略

1. **cargo test（core 层）**：会话向量（§5）、白名单过滤（含 43 条清单 id 全过）、
   限流键/日界、DeepSeek 载荷构造。
2. **parity 冒烟**：`wrangler dev` 起 rust-dojo-api，脚本逐端点打请求，与现网响应
   （状态码 + JSON 形状 + Set-Cookie 属性）对比；fixtures 先从现网采集。
3. **上线后 E2E**：OTP 登录全程（D1 取码）→ 进度 sync 往返（必须含 `p1-xx` 勾选且
   刷新不丢，即今天修的回归）→ AI hint 一次真实调用 → 判题一次（确认非 API 路径未受
   影响）。
4. 现有 vitest / soundness 全量不动、必须保持绿。

## 10. 部署顺序与回滚

1. 部署 `rust-dojo-api` + 设 secrets（此时无流量，安全）。
2. `wrangler dev` parity 冒烟通过后，部署主 Worker（main 切到 worker-entry.mjs + API binding）。
3. E2E（§9.3）通过才算完成。
- **回滚**：`wrangler.jsonc` 的 main 改回 `.open-next/worker.js`、去掉 API binding，重部署。
  一行改动，Next 侧路由与绑定都还在。
- soak ≥ 1 周后另行提交清理 commit（删 Next API 路由 + 收缩主 Worker 绑定）。
- 生产部署与 secrets 写入按惯例人工确认后执行。

## 11. 量级与里程碑

3–5 天。M1 骨架+会话兼容（向量全绿）；M2 auth 四端点 parity；M3 progress + ai parity；
M4 入口切流 + E2E。每个 M 结束跑一次全量 vitest。

## 12. 已知风险

- **R1** `worker-entry.mjs` 需转出 OpenNext worker.js 的全部附带导出（DO 类等）；
  实施第一步就验证导出清单，若有命名冲突改用显式 re-export。
- **R2** workers-rs 的 D1 `batch` 支持需实测（sync 的 mergeProgress 用 batch）；
  不行则退化为顺序 prepare/run（语义等价，多几次往返）。
- **R3** wasm 包体与冷启动：workers-rs 空载 ~200–400KB，预期无碍；上线后看
  Worker Startup Time。
- **R4** `cf-connecting-ip` 在 service binding 子请求中沿用原请求头——限流按真实
  客户端 IP 记，实施时在 parity 冒烟里断言。
