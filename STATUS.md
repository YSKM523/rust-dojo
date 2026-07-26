# rust-dojo STATUS

**Rust 道场** — 中文 Rust 后端实战学习平台（从 0 到可就业，按 2026-07 真实 JD 调研设计）。sql-dojo 的姊妹项目（架构同源）。

- **线上**: https://rust-dojo.pp-account.workers.dev （CF Worker via OpenNext）
- **部署**: `npm run deploy`（= opennextjs-cloudflare build && deploy；exit 144 非失败，看输出 URL）
- **绑定**: D1 `rust-dojo` (39bf19ae-6f2b-4ab9-8a91-20a2839fd8e5)、KV `RUST_DOJO_AI_RATELIMIT`、service binding `MAIL` → lakebbs-mail
- **Secrets**: SESSION_SECRET（独立生成）/ MAIL_API_SECRET / DEEPSEEK_API_KEY（后两个与 sql-dojo 同值；本地 `.dev.vars`）
- **判题**: 浏览器直连 play.rust-lang.org/execute（CORS `*`，无代理）；三模式 stdout/compile/tests；期望输出作者预生成（`scripts/gen-expected.mjs`），`npm run test:soundness`（PLAYGROUND_TESTS=1，串行打真实 Playground）守护答案不脱节
- **进度**: local-first localStorage `rustdojo:completed` + 登录 union merge 到 D1；项目验收清单项（p1-01…）与练习共用 progress 命名空间；cookie `rdsess`

## 当前状态（2026-07-26 全站收官）
- **内容全量上线：8 模块 61 道练习全部 soundness 实测**（每题答案必过 + starter 必挂/输出必异，`PLAYGROUND_TESTS=1 npm run test:soundness` 61/61）；p1–p4 项目 brief + 43 条验收清单；求职资源 25 条（真实 Indeed 调研）
- 前端：awwwards 动效层（cargo boot hero、滚动模块阶梯、跑马灯、count-up、clip-reveal 语法，全部纯自建零依赖）；full-bleed 无侧边留白；**双主题**（暗=默认近黑蓝灰，亮=暖纸面，`dark:` 变体经 @custom-variant 跟随 data-theme）；多色系统（层级色 lib/tier.ts：小白绿/初级蓝/中级紫/高级琥珀/冲刺橙，数据条四色块）
- 线上 E2E 已验：prod 判题、OTP 登录（D1 取码）、进度落 D1；双主题 WCAG AA 测试覆盖（app/theme-contrast.test.ts）
- m7 注意：axum 不在 Playground top-100，练习用等价 handler 形状模型；真 axum 在 p4 项目

## 下一步（可选）
- 域名绑定（如要对外）；学习过程中按需补题/修题
- 内容创作协议（补新模块时用）：agent 只写 `content/exercises/moduleN.ts` + `content/modules/mN.lesson.ts`，index 注册由集成者做

## 坑
- wrangler.jsonc 里 D1/KV id 为空串会导致所有 wrangler 命令拒绝解析（连 `d1 create` 都跑不了）
- bootstrap 占位测试断言"内容为空"，每填一批内容都要同步改断言
- 练习 prompt 是 markdown，必须经 LessonView 渲染（直接 {exercise.prompt} 会露出 ### 和代码围栏）
