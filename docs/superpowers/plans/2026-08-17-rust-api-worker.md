# rust-dojo Phase A：rust-dojo-api Worker 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 rust-dojo 的全部 7 个 `/api/*` 端点迁到新的 workers-rs Worker `rust-dojo-api`，行为与现网逐端点等价，存量 `rdsess` cookie 无感存活。

**Architecture:** 主 Worker 换薄入口 `worker-entry.mjs`，`/api/*` 经 service binding 转发给 rust-dojo-api（workers-rs/wasm），其余透传 OpenNext handler。纯逻辑放 `core/`（native 可编译，cargo test 直接跑），worker glue 放 `routes/`。内容白名单与题面经 `manifest.json` 编译期内嵌。

**Tech Stack:** workers-rs（`worker` crate, `d1` feature）、serde/serde_json、hmac+sha2+base64、esbuild 生成脚本（Node）、vitest 守卫。

**Spec:** `docs/superpowers/specs/2026-08-17-rust-api-worker-design.md`

## Global Constraints

- 会话令牌格式必须字节兼容：`b64url(JSON{uid,email,exp}).b64url(HMAC-SHA256(payloadB64, secret))`，b64url **无 padding**，`exp` epoch 毫秒，JSON 字段序 `uid,email,exp`。
- 所有面向用户的中文错误文案必须与 TS 原文**逐字一致**（parity 冒烟按字符串断言）。
- `worker` 依赖必须是 target-specific（`[target.'cfg(target_arch = "wasm32")'.dependencies]`），`core/` 不得 import worker 类型——否则 native `cargo test` 编不过。
- D1 SQL 语句与 TS 版逐字一致（表结构不改）。
- KV 限流键格式沿用 `rl:{scope}:{day}`，TTL 26 小时；AI 日限 40，OTP email 日限 8、IP 日限 30。
- cookie：`rdsess; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=…`；登出 Max-Age=0。
- 不改前端、不改判题、不删 Next 侧 API 路由（过渡期保留）。
- git commit 不加 Co-Authored-By。

## 环境事实（执行前置，Task 0 处理）

- cargo 1.92.0 已装；**wasm32-unknown-unknown target 未装；worker-build 未装**。
- `.open-next/worker.js` 导出已验证：`export { DOQueueHandler }`、`export { DOShardedTagCache }`、`export { BucketCachePurge }`、`export default`（R1 风险落地：worker-entry 需 re-export 这三个类）。
- CF 部署凭证：`source ~/.config/cloudflare/env` 取 `CLOUDFLARE_API_TOKEN`。
- wrangler/npm 退出码 144 非失败，判据看输出。

---

### Task 0: 工具链准备（编排者自己做，不派子代理）

**Files:** 无仓库改动。

- [ ] **Step 1:** `rustup target add wasm32-unknown-unknown`（若无 rustup，用 `~/.cargo` 现有安装路径确认后再决定）
- [ ] **Step 2:** `cargo install worker-build --locked`（耗时几分钟，后台跑）
- [ ] **Step 3:** `worker-build --version` 与 `rustc --print target-list | grep wasm32-unknown-unknown` 验证

---

### Task 1: 生成脚本 + manifest + 会话测试向量（TS；派 claude opus 子代理）

**Files:**
- Create: `scripts/gen-manifest.mjs`
- Create: `scripts/gen-session-vectors.mjs`
- Create: `workers/api/manifest.json`（生成物，提交）
- Create: `workers/api/tests/fixtures/session-vectors.json`（生成物，提交）
- Create: `content/manifest-sync.test.ts`
- Test: `content/manifest-sync.test.ts`

**Interfaces:**
- Consumes: `content/exercises` 的 `allExercises`、`content/projects` 的 `allProjects`、`lib/auth/session.ts` 的 `signSession`。
- Produces（后续 Rust 任务依赖的两个 JSON 契约）：
  - `manifest.json`: `{ "progressIds": string[], "exercises": { [id]: { "title": string, "prompt": string } } }`，progressIds = 60 练习 id + 43 清单 id，顺序：先全部练习（模块序）再全部清单（项目序）。
  - `session-vectors.json`: `Array<{ name: string, token: string, secret: string, now: number, expect: null | { uid: string, email: string, exp: number } }>`。

- [ ] **Step 1: 写 `scripts/gen-manifest.mjs`**（esbuild 就地加载 TS 的模式抄 `scripts/gen-expected.mjs` 顶部）：

```js
#!/usr/bin/env node
// 从 TS 内容生成 workers/api/manifest.json（Rust worker include_str! 编译期内嵌）。
import * as esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadModule(entry, exportNames) {
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true, write: false, format: 'esm', platform: 'node',
    target: 'node20', alias: { '@': ROOT },
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`;
  return import(dataUrl);
}

const { allExercises } = await loadModule('content/exercises/index.ts');
const { allProjects } = await loadModule('content/projects.ts');

const exerciseIds = allExercises.map((e) => e.id);
const checklistIds = allProjects.flatMap((p) => p.items.map((i) => i.id));
const manifest = {
  progressIds: [...exerciseIds, ...checklistIds],
  exercises: Object.fromEntries(allExercises.map((e) => [e.id, { title: e.title, prompt: e.prompt }])),
};

const out = path.join(ROOT, 'workers/api/manifest.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(manifest, null, 1) + '\n');
console.log(`manifest: ${manifest.progressIds.length} progressIds (${exerciseIds.length} exercises + ${checklistIds.length} checklist), ${Object.keys(manifest.exercises).length} exercise entries`);
```

- [ ] **Step 2: 跑 `node scripts/gen-manifest.mjs`**，期望打印 `103 progressIds (60 exercises + 43 checklist)`。
- [ ] **Step 3: 写 `scripts/gen-session-vectors.mjs`**（用**现 TS 实现**签发，Rust 验签必须逐条一致）：

```js
#!/usr/bin/env node
// 用现役 TS 实现生成会话验签测试向量，Rust core::session 必须逐条复现结果。
import * as esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = await esbuild.build({
  entryPoints: [path.join(ROOT, 'lib/auth/session.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'node20',
  alias: { '@': ROOT },
});
const { signSession } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
);

const SECRET = 'test-secret-0123456789abcdef';
const NOW = 1755400000000; // 固定时钟，向量可复现
const payload = { uid: 'u-123', email: 'dojo@example.com', exp: NOW + 86_400_000 };
// 中文邮箱域名测非 ASCII 路径（b64url 前经 TextEncoder UTF-8）
const cjkPayload = { uid: 'u-中文', email: '道场@example.com', exp: NOW + 86_400_000 };

const valid = await signSession(payload, SECRET);
const cjk = await signSession(cjkPayload, SECRET);
const expired = await signSession({ ...payload, exp: NOW - 1000 }, SECRET);
const wrongSecret = await signSession(payload, 'another-secret');
const [p, sig] = valid.split('.');
const tampered = `${p}.${sig.slice(0, -2)}${sig.endsWith('AA') ? 'BB' : 'AA'}`;
const badPayload = `${Buffer.from('not-json').toString('base64url')}.${sig}`;

const vectors = [
  { name: 'valid', token: valid, secret: SECRET, now: NOW, expect: payload },
  { name: 'valid-cjk-utf8', token: cjk, secret: SECRET, now: NOW, expect: cjkPayload },
  { name: 'expired', token: expired, secret: SECRET, now: NOW, expect: null },
  { name: 'exp-boundary-equal-now', token: await signSession({ ...payload, exp: NOW }, SECRET), secret: SECRET, now: NOW, expect: null },
  { name: 'wrong-secret', token: wrongSecret, secret: SECRET, now: NOW, expect: null },
  { name: 'tampered-sig', token: tampered, secret: SECRET, now: NOW, expect: null },
  { name: 'bad-payload-json', token: badPayload, secret: SECRET, now: NOW, expect: null },
  { name: 'no-dot', token: 'nodotatall', secret: SECRET, now: NOW, expect: null },
  { name: 'empty', token: '', secret: SECRET, now: NOW, expect: null },
];

const out = path.join(ROOT, 'workers/api/tests/fixtures/session-vectors.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(vectors, null, 1) + '\n');
console.log(`${vectors.length} vectors written`);
```

- [ ] **Step 4: 跑 `node scripts/gen-session-vectors.mjs`**，期望 `9 vectors written`；抽查 `valid` 的 token 用 TS `verifySession` 能解回（脚本已隐含——signSession 来自现役实现即可）。
- [ ] **Step 5: 写守卫测试 `content/manifest-sync.test.ts`**（防内容改了忘 regen）：

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { allExercises } from '@/content/exercises';
import { allProjects } from '@/content/projects';

// workers/api/manifest.json 是 scripts/gen-manifest.mjs 的生成物，Rust worker 编译期内嵌。
// 内容变更后必须重跑生成脚本，否则 Rust 侧白名单/题面漂移——这条测试就是那道闸。
describe('workers/api/manifest.json 与内容同步', () => {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), 'workers/api/manifest.json'), 'utf8'),
  ) as { progressIds: string[]; exercises: Record<string, { title: string; prompt: string }> };

  it('progressIds = 全部练习 id + 全部清单 id（顺序一致）', () => {
    const expected = [
      ...allExercises.map((e) => e.id),
      ...allProjects.flatMap((p) => p.items.map((i) => i.id)),
    ];
    expect(manifest.progressIds).toEqual(expected);
  });

  it('exercises 条目与内容一致', () => {
    expect(Object.keys(manifest.exercises).sort()).toEqual(allExercises.map((e) => e.id).sort());
    for (const e of allExercises) {
      expect(manifest.exercises[e.id]).toEqual({ title: e.title, prompt: e.prompt });
    }
  });
});
```

- [ ] **Step 6:** `npx vitest run content/manifest-sync.test.ts` → 2 passed。再跑 `npx vitest run` 全量确认无破坏。
- [ ] **Step 7: Commit** `feat: content manifest and session test vectors for the Rust API worker`

---

### Task 2: Rust crate 骨架 + core 纯逻辑（Rust；派 codex 子代理）

**Files:**
- Create: `workers/api/Cargo.toml`
- Create: `workers/api/wrangler.jsonc`
- Create: `workers/api/src/lib.rs`
- Create: `workers/api/src/core/mod.rs`、`session.rs`、`progress.rs`、`ratelimit.rs`、`code.rs`、`email.rs`、`ai.rs`
- Test: 各 core 模块内 `#[cfg(test)]`；向量 fixture 已由 Task 1 就位

**Interfaces:**
- Consumes: `workers/api/manifest.json`、`workers/api/tests/fixtures/session-vectors.json`（Task 1 契约）。
- Produces（Task 3 routes 依赖的精确签名）：
```rust
// core::session
pub struct SessionPayload { pub uid: String, pub email: String, pub exp: i64 }
pub fn sign_session(payload: &SessionPayload, secret: &str) -> String;
pub fn verify_session(token: &str, secret: &str, now_ms: i64) -> Option<SessionPayload>;
// core::progress
pub struct Manifest { /* progressIds + exercises，serde 反序列化 */ }
pub fn manifest() -> &'static Manifest;                    // include_str!("../manifest.json") + OnceLock
pub fn is_known_progress_id(id: &str) -> bool;
pub fn filter_known_progress_ids(ids: &[serde_json::Value]) -> Vec<String>;
pub fn exercise_context(id: &str) -> Option<(&'static str, &'static str)>; // (title, prompt)
// core::ratelimit
pub fn rl_key(scope: &str, day: &str) -> String;           // "rl:{scope}:{day}"
pub struct RateDecision { pub allowed: bool, pub remaining: u32, pub new_count: u32 }
pub fn decide(current: u32, limit: u32) -> RateDecision;   // KV 读写留在 routes
// core::code
pub const MAX_CODE_ATTEMPTS: u32 = 5;
pub enum CodeVerdict { Ok, Wrong, Expired, Consumed, Exhausted }
pub struct CodeRow { pub code: String, pub expires_at: i64, pub consumed: i64, pub attempts: i64 }
pub fn code_from(n: u32) -> String;                        // n % 1_000_000 六位补零；随机数由 routes 取
pub fn is_valid_email(email: &str) -> bool;                // 复刻 /^[^\s@]+@[^\s@]+\.[^\s@]+$/
pub fn evaluate_code(row: &CodeRow, input: &str, now_ms: i64) -> CodeVerdict;
// core::email
pub struct MailContent { pub subject: String, pub html: String, pub text: String }
pub fn build_otp_email(code: &str) -> MailContent;         // 中文文案逐字复刻 lib/auth/email.ts
// core::ai
pub enum AiAction { Hint, Explain, Debug }
pub struct AiPayload { pub title: Option<String>, pub prompt: Option<String>, pub code: String, pub error_msg: Option<String>, pub status: String }
pub fn build_messages(action: AiAction, p: &AiPayload) -> serde_json::Value; // [{role,content},...]
pub fn deepseek_body(model: &str, messages: &serde_json::Value) -> serde_json::Value; // {model,messages,max_tokens:1024,stream:false}
```

- [ ] **Step 1: `Cargo.toml`**（worker 必须 target-specific，core 才能 native 测试）：

```toml
[package]
name = "rust-dojo-api"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
hmac = "0.12"
sha2 = "0.10"
base64 = "0.22"

[target.'cfg(target_arch = "wasm32")'.dependencies]
worker = { version = "0.6", features = ["d1"] }
```

（若 `worker` 最新版本号不同，用 `cargo add --target wasm32-unknown-unknown worker --features d1` 拿当前版并保留 target-specific 位置。）

- [ ] **Step 2: `src/lib.rs` 骨架**：`pub mod core;`，`#[cfg(target_arch = "wasm32")] mod routes;`（routes 本任务先空）。
- [ ] **Step 3（TDD，逐模块）: core::session** ——先写向量测试：

```rust
// src/core/session.rs 尾部
#[cfg(test)]
mod tests {
    use super::*;
    #[derive(serde::Deserialize)]
    struct Vector { name: String, token: String, secret: String, now: i64, expect: Option<Expected> }
    #[derive(serde::Deserialize)]
    struct Expected { uid: String, email: String, exp: i64 }

    #[test]
    fn ts_vectors_all_agree() {
        let raw = include_str!("../../tests/fixtures/session-vectors.json");
        let vectors: Vec<Vector> = serde_json::from_str(raw).unwrap();
        assert!(vectors.len() >= 9);
        for v in vectors {
            let got = verify_session(&v.token, &v.secret, v.now);
            match (&got, &v.expect) {
                (Some(g), Some(e)) => {
                    assert_eq!(g.uid, e.uid, "{}", v.name);
                    assert_eq!(g.email, e.email, "{}", v.name);
                    assert_eq!(g.exp, e.exp, "{}", v.name);
                }
                (None, None) => {}
                _ => panic!("{}: got {:?}, expect {:?}", v.name, got.is_some(), v.expect.is_some()),
            }
        }
    }

    #[test]
    fn roundtrip_and_ts_compatible_shape() {
        let p = SessionPayload { uid: "u-9".into(), email: "x@y.z".into(), exp: 2_000_000_000_000 };
        let t = sign_session(&p, "s3cret");
        // token 形如 payloadB64.sigB64，b64url 无 padding
        assert_eq!(t.matches('.').count(), 1);
        assert!(!t.contains('='));
        let back = verify_session(&t, "s3cret", 1_000_000_000_000).unwrap();
        assert_eq!(back.uid, "u-9");
        assert!(verify_session(&t, "wrong", 1_000_000_000_000).is_none());
    }
}
```

- [ ] **Step 4:** `cargo test`（在 `workers/api/`）→ 编译失败/测试失败（还没实现）。
- [ ] **Step 5: 实现 session**（要点：`base64::engine::general_purpose::URL_SAFE_NO_PAD`；HMAC 输入是 **payloadB64 的 ASCII 字节**；`verify` 用 `lastIndexOf('.')` 语义——`token.rfind('.')` 且 `dot > 0`；签名比对定长时间——两段都 hmac 后 `subtle`? 简化：比较 `hmac(p)` 与收到 sig 的**字节相等**即可（服务端重算，不泄漏）；`exp <= now` 即拒绝；JSON 解析后校验 uid/email 为 string、exp 为 number）。
- [ ] **Step 6:** `cargo test` → session 两测通过。
- [ ] **Step 7（TDD 同法）: core::progress**——测试断言：`manifest().progress_ids.len() == 103`；`is_known_progress_id("m1-01")`、`is_known_progress_id("p1-01")` 为 true、`"m9-99"`/`""` 为 false；`filter_known_progress_ids` 丢掉非字符串与未知 id 并保序；`exercise_context("m1-01")` 的 title 非空。实现用 `include_str!("../../manifest.json")` + `std::sync::OnceLock` + `HashSet`。
- [ ] **Step 8（TDD）: core::ratelimit**——`rl_key("otp-ip:1.2.3.4","2026-08-17") == "rl:otp-ip:1.2.3.4:2026-08-17"`；`decide(39,40).allowed && remaining==0 && new_count==40`；`decide(40,40).allowed == false`。
- [ ] **Step 9（TDD）: core::code**——`code_from(7) == "000007"`；`code_from(1_234_567) == "234567"`；邮箱正则复刻（`"a@b.c"` true、`"a b@c.d"` false、`"a@b"` false）；`evaluate_code` 判序：consumed → exhausted(attempts>=5) → expired(now>=expires_at) → wrong/ok（与 TS `evaluateCode` 顺序一致）。
- [ ] **Step 10（TDD）: core::email + core::ai**——email 断言 subject == `Rust 道场登录验证码：123456`、text/html 含验证码与「10 分钟内有效」；ai 断言三种 action 的 system/user content 与 TS **逐字一致**（把 `lib/ai/prompts.ts` 的模板字符串原样搬进 Rust `format!`，测试里断言关键整句），`deepseek_body` 含 `max_tokens:1024`、`stream:false`。TS 原文以仓库 `lib/ai/prompts.ts`、`lib/auth/email.ts` 为唯一事实源，实现前先读原文件。
- [ ] **Step 11:** `cargo test` 全绿；`cargo clippy --all-targets` 无 error。
- [ ] **Step 12: Commit** `feat(workers/api): rust-dojo-api crate with native-testable core (session/progress/ratelimit/code/email/ai)`

---

### Task 3: routes glue + wrangler 配置 + wasm 构建（Rust；派 codex 子代理）

**Files:**
- Create: `workers/api/src/routes/mod.rs`、`auth.rs`、`progress.rs`、`ai.rs`
- Modify: `workers/api/src/lib.rs`（挂 `#[event(fetch)]` 路由）
- Create/Modify: `workers/api/wrangler.jsonc`

**Interfaces:**
- Consumes: Task 2 全部 core 签名（原样）。
- Produces: Worker `rust-dojo-api`，路由矩阵与响应契约见下表（Task 4 parity 冒烟按此断言）。

**行为事实源**：`app/api/auth/*/route.ts`、`app/api/progress{,/sync}/route.ts`、`app/api/ai/route.ts`、`lib/db/d1.ts`、`lib/mail/send.ts`、`lib/ai/deepseek.ts`——**先读原文件再写**，下表是索引不是替代：

| 路由 | 关键行为 |
|---|---|
| POST /api/auth/request-code | 非法 JSON→400 `请求格式错误`；邮箱 trim+lowercase，非法→400 `邮箱格式不对`；缺 DB/MAIL/MAIL_API_SECRET→503 `登录暂未配置`；KV 限流 `otp-email:{email}` 8/日 + `otp-ip:{ip}` 30/日（ip 取 `cf-connecting-ip` 缺省 `anon`，day=UTC `YYYY-MM-DD`），超→429 `验证码发送太频繁，请稍后再试`；insert login_codes（TTL 10min）；MAIL binding `POST https://lakebbs-mail/send` Bearer MAIL_API_SECRET，失败→502 `验证码发送失败，请稍后再试`；成功 `{ok:true}` |
| POST /api/auth/verify | 格式校验（六位数字码）→400 `邮箱或验证码格式不对`；无记录→400 `请先获取验证码`；verdict wrong→bump attempts 且 400 `验证码不对`（expired/consumed/exhausted 各自文案见 TS）；ok→consume、upsert user、签发 30 天会话、Set-Cookie `rdsess`、返回 `{user:{email,displayName}}` |
| GET /api/auth/me | 无 SESSION_SECRET→`{user:null}`；验签成功→`{user:{email}}` 否则 `{user:null}`（都是 200） |
| POST /api/auth/logout | `{ok:true}` + 清 cookie（Max-Age=0） |
| GET /api/progress | 未登录 401 `未登录`；返回 `{ids:[...]}` |
| POST/DELETE /api/progress | body `{exerciseId}`，白名单外→400 `无效 exerciseId`；upsert/DELETE；`{ok:true}` |
| POST /api/progress/sync | body `{ids}` 经 `filter_known_progress_ids`；mergeProgress（batch INSERT ON CONFLICT DO NOTHING）后回传全量 `{ids}` |
| POST /api/ai | action∉{hint,explain,debug}→400 `未知操作`；非 hint 且 code 空→400 `请先写点 Rust 代码`；缺 DEEPSEEK_API_KEY→503 `AI 暂未配置`；KV 限流 `ai:{ip}` 40/日→429 `今天的 AI 次数用完了，明天再来吧`（注意 TS 键 scope 是裸 ip：`rl:{ip}:{day}`，读 `app/api/ai/route.ts` 确认后照抄）；exercise 上下文查 manifest；DeepSeek 失败→502 `AI 调用失败：{err}`；成功 `{reply}` |

- [ ] **Step 1: `wrangler.jsonc`**：

```jsonc
{
  "name": "rust-dojo-api",
  "main": "build/worker/shim.mjs",
  "compatibility_date": "2025-09-23",
  "build": { "command": "cargo install -q worker-build && worker-build --release" },
  "vars": { "DEEPSEEK_MODEL": "deepseek-v4-pro" },
  "kv_namespaces": [{ "binding": "AI_RATELIMIT", "id": "7f3db3d89431422ea3a8068bef7c4fbd" }],
  "d1_databases": [{ "binding": "DB", "database_name": "rust-dojo", "database_id": "39bf19ae-6f2b-4ab9-8a91-20a2839fd8e5" }],
  "services": [{ "binding": "MAIL", "service": "lakebbs-mail" }]
}
```

- [ ] **Step 2: lib.rs 路由分发**（worker 0.6 的 `Router` 或手写 match `req.path()` × method；未匹配→404 JSON `{error:"not found"}`）。
- [ ] **Step 3: 逐路由实现**，D1 语句从 `lib/db/d1.ts` 逐字搬（含 `ON CONFLICT(user_id, exercise_id) DO NOTHING`）；随机验证码用 `worker` 的 crypto（`getrandom`/`js_sys` 经 worker 提供，或 `Date::now` 禁用——用 `worker::js_sys::Math::random` 不行，需 crypto：`worker` crate 提供 `crypto` 可用 `getrandom` feature；如遇阻，用 `js_sys::global()` 的 `crypto.getRandomValues`，实现时取最直接可行路径）；DeepSeek 调用用 `worker::Fetch::Request`（不用 reqwest）；`mergeProgress` 优先 `D1Database::batch`，若 workers-rs batch 不可用（R2 风险）退化为顺序执行并留注释。
- [ ] **Step 4:** `cargo test` 仍全绿（core 未动）；`cargo clippy --target wasm32-unknown-unknown --all-targets` 无 error。
- [ ] **Step 5: 本地起服**：`cd workers/api && npx wrangler dev --port 8788`（首次 worker-build 编译较久）。冒烟三条：
  - `curl -s localhost:8788/api/auth/me` → `{"user":null}`
  - `curl -s -X POST localhost:8788/api/progress/sync` → 401 `{"error":"未登录"}`
  - `curl -s -X POST localhost:8788/api/ai -d '{"action":"nope"}' -H 'content-type: application/json'` → 400 `{"error":"未知操作"}`
- [ ] **Step 6: Commit** `feat(workers/api): route glue for auth/progress/ai with D1, KV, MAIL and DeepSeek`

---

### Task 4: parity 冒烟脚本（TS；派 claude opus 子代理）

**Files:**
- Create: `scripts/parity-smoke.mjs`

**Interfaces:**
- Consumes: Task 3 的路由契约表。
- Produces: `node scripts/parity-smoke.mjs <baseUrl> [--against <baseUrl2>]`——单目标模式按内置期望断言；`--against` 模式对两个目标发同样请求并 diff（status、JSON 键集合、错误文案、Set-Cookie 属性）。退出码非 0 即失败。

- [ ] **Step 1: 写脚本**。请求矩阵（只含无副作用请求，绝不真发邮件/真调 DeepSeek）：

```js
#!/usr/bin/env node
// parity 冒烟：对 rust-dojo API 打一组无副作用请求，断言响应契约。
// 用法：node scripts/parity-smoke.mjs http://localhost:8788
//       node scripts/parity-smoke.mjs http://localhost:8788 --against https://rust-dojo.pp-account.workers.dev
const CASES = [
  { name: 'me-unauth', method: 'GET', path: '/api/auth/me', expect: { status: 200, body: { user: null } } },
  { name: 'me-bad-cookie', method: 'GET', path: '/api/auth/me', headers: { cookie: 'rdsess=abc.def' }, expect: { status: 200, body: { user: null } } },
  { name: 'request-code-bad-json', method: 'POST', path: '/api/auth/request-code', raw: '{oops', expect: { status: 400, error: '请求格式错误' } },
  { name: 'request-code-bad-email', method: 'POST', path: '/api/auth/request-code', json: { email: 'nope' }, expect: { status: 400, error: '邮箱格式不对' } },
  { name: 'verify-bad-format', method: 'POST', path: '/api/auth/verify', json: { email: 'a@b.c', code: '12' }, expect: { status: 400, error: '邮箱或验证码格式不对' } },
  { name: 'verify-no-code', method: 'POST', path: '/api/auth/verify', json: { email: 'parity-nobody@example.com', code: '123456' }, expect: { status: 400, error: '请先获取验证码' } },
  { name: 'logout', method: 'POST', path: '/api/auth/logout', expect: { status: 200, body: { ok: true }, clearsCookie: true } },
  { name: 'progress-unauth', method: 'GET', path: '/api/progress', expect: { status: 401, error: '未登录' } },
  { name: 'progress-post-unauth', method: 'POST', path: '/api/progress', json: { exerciseId: 'm1-01' }, expect: { status: 401, error: '未登录' } },
  { name: 'sync-unauth', method: 'POST', path: '/api/progress/sync', json: { ids: ['m1-01'] }, expect: { status: 401, error: '未登录' } },
  { name: 'ai-bad-action', method: 'POST', path: '/api/ai', json: { action: 'nope' }, expect: { status: 400, error: '未知操作' } },
  { name: 'ai-empty-code', method: 'POST', path: '/api/ai', json: { action: 'debug', code: '' }, expect: { status: 400, error: '请先写点 Rust 代码' } },
];
// 实现：fetch 每条；单目标断言 status 与 body（error 字符串全等 / body 深比较 / clearsCookie 验 set-cookie 含 rdsess= 和 Max-Age=0）；
// --against 双目标模式对 status、JSON.stringify(排序键) 、set-cookie 的 (HttpOnly,Secure,SameSite,Path,Max-Age) 五属性做 diff，全一致才过。
// 每条打印 PASS/FAIL 与差异明细；任何 FAIL 进程退出码 1。
```

（注释即实现要求：断言逻辑必须完整写出，不留 TODO。）

- [ ] **Step 2:** `node scripts/parity-smoke.mjs https://rust-dojo.pp-account.workers.dev` → 现网（Next 实现）全 PASS——先证明期望矩阵本身对。
- [ ] **Step 3: Commit** `test: parity smoke matrix for the API worker cutover`

---

### Task 5: 主 Worker 薄入口 + 切流配置（编排者自己做，改动小且高危）

**Files:**
- Create: `worker-entry.mjs`
- Modify: `wrangler.jsonc`（`main` + `services` 增 `API`）

**Interfaces:**
- Consumes: `.open-next/worker.js` 的 `default` 与三个 DO 类导出（已验证）；service binding `API` → rust-dojo-api。
- Produces: 主 Worker 入口；`/api/*` 全部走 Rust。

- [ ] **Step 1: `worker-entry.mjs`**：

```js
// 薄入口：/api/* 转发给 rust-dojo-api（service binding），其余透传 OpenNext handler。
// 回滚 = wrangler.jsonc 的 main 改回 .open-next/worker.js 并删掉 API binding。
import handler from './.open-next/worker.js';
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) {
      return env.API.fetch(request);
    }
    return handler.fetch(request, env, ctx);
  },
};
```

- [ ] **Step 2: `wrangler.jsonc`**：`"main": "worker-entry.mjs"`；`services` 数组加 `{ "binding": "API", "service": "rust-dojo-api" }`（MAIL 保留）。
- [ ] **Step 3:** `npm run build`（OpenNext 重建后 `.open-next/worker.js` 导出可能变化——re-export 行若报缺失导出，按当次实际导出清单修正）。
- [ ] **Step 4: Commit** `feat: thin worker entry routing /api/* to rust-dojo-api via service binding`

---

### Task 6: 部署、切流、E2E 验收（编排者自己做；生产动作按惯例确认）

- [ ] **Step 1: 部署 rust-dojo-api（无流量，安全）**：`cd workers/api && source ~/.config/cloudflare/env && npx wrangler deploy`
- [ ] **Step 2: 设 secrets（与现网同值；从主 Worker 读不出来，需从 `.dev.vars` / 既有渠道取）**：`wrangler secret put SESSION_SECRET|MAIL_API_SECRET|DEEPSEEK_API_KEY`（rust-dojo-api 上）
- [ ] **Step 3: parity（rust 直连 vs 现网）**：`node scripts/parity-smoke.mjs https://rust-dojo-api.pp-account.workers.dev --against https://rust-dojo.pp-account.workers.dev` → 全 PASS
- [ ] **Step 4: 【向用户确认后】切流**：部署主 Worker（Task 5 产物），`npm run deploy`
- [ ] **Step 5: 切流后 E2E**：
  - parity 再打生产：`node scripts/parity-smoke.mjs https://rust-dojo.pp-account.workers.dev` 全 PASS（此时由 Rust 服务）
  - OTP 全程：页面发码 → `wrangler d1 execute rust-dojo --remote --command "SELECT code FROM login_codes ORDER BY created_at DESC LIMIT 1"` 取码 → 登录成功、`rdsess` 落地、`/api/auth/me` 返回邮箱
  - 进度：登录态勾一条 `p1-xx` → 刷新不丢（今天修的回归）→ D1 里能查到
  - AI：hint 真实调用返回中文回复
  - 判题：随便一题运行一次，确认非 API 路径未受影响
- [ ] **Step 6: 回归护栏**：`npx vitest run` 全绿
- [ ] **Step 7: Commit + 更新 STATUS.md**（Phase A 上线、回滚方法、soak 清单）
