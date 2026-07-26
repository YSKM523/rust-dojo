# rust-dojo STATUS

**Rust 道场** — 中文 Rust 后端实战学习平台（从 0 到可就业，按 2026-07 真实 JD 调研设计）。sql-dojo 的姊妹项目（架构同源）。

- **线上**: https://rust-dojo.pp-account.workers.dev （CF Worker via OpenNext）
- **部署**: `npm run deploy`（= opennextjs-cloudflare build && deploy；exit 144 非失败，看输出 URL）
- **绑定**: D1 `rust-dojo` (39bf19ae-6f2b-4ab9-8a91-20a2839fd8e5)、KV `RUST_DOJO_AI_RATELIMIT`、service binding `MAIL` → lakebbs-mail
- **Secrets**: SESSION_SECRET（独立生成）/ MAIL_API_SECRET / DEEPSEEK_API_KEY（后两个与 sql-dojo 同值；本地 `.dev.vars`）
- **判题**: 浏览器直连 play.rust-lang.org/execute（CORS `*`，无代理）；三模式 stdout/compile/tests；期望输出作者预生成（`scripts/gen-expected.mjs`），`npm run test:soundness`（PLAYGROUND_TESTS=1，串行打真实 Playground）守护答案不脱节
- **进度**: local-first localStorage `rustdojo:completed` + 登录 union merge 到 D1；项目验收清单项（p1-01…）与练习共用 progress 命名空间；cookie `rdsess`

## 当前状态（2026-07-26 Batch A 上线）
- 平台全量可用：判题层、编辑器（CodeMirror rust）、项目验收清单、OTP 登录、云同步、AI copilot、落地页/资源页
- 内容：**m1 完整**（9 题全部 soundness 实测过）；m2–m8 为导览版 lesson（练习未上）；p1–p4 项目 brief + 验收清单（43 项）完整；求职资源 25 条（JD 对照/面试题/速查表，基于真实 Indeed 调研）
- 线上 E2E 已验：prod 判题、OTP 登录（D1 取码）、进度落 D1

## 下一步
- Batch B: m2、m3 练习+完整 lesson；Batch C: m4–m6；Batch D: m7、m8 + awwwards-craft 视觉终审
- 并行创作协议：每模块 agent 只写 `content/exercises/moduleN.ts` + `content/modules/mN.lesson.ts`（新文件），index 注册由集成者统一做，避免冲突
- 遗留：无 cron/监控需求；域名未绑（workers.dev 够用）

## 坑
- wrangler.jsonc 里 D1/KV id 为空串会导致所有 wrangler 命令拒绝解析（连 `d1 create` 都跑不了）
- bootstrap 占位测试断言"内容为空"，每填一批内容都要同步改断言
- 练习 prompt 是 markdown，必须经 LessonView 渲染（直接 {exercise.prompt} 会露出 ### 和代码围栏）
