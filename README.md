# Rust 道场 · Rust Dojo

调用 Rust Playground 真实编译运行的中文 Rust 后端实战学习平台。

当前仓库是平台骨架：课程、练习、实战项目与判题引擎将在后续任务中接入。

## 技术栈

Rust Worker（workers-rs）· Askama SSR · Vanilla TypeScript islands · Tailwind v4 · CodeMirror 6 · Vitest · Cloudflare Workers · D1

## 本地开发

```bash
npm install
npm run dev
npm run deploy
npx vitest run
npx tsc --noEmit
npx eslint .
cd workers/api && cargo test
```

`npm run dev` 从仓库根目录的 `.dev.vars` 加载本地 secrets，并启动 `workers/api` 中的单 Rust Worker。`npm run deploy` 先构建静态 assets，再部署同一个 Worker。

## 内容契约

- `lib/rust/types.ts`：模块、练习、判题结果与实战项目的共享类型。
- `content/`：课程、练习、项目和学习资源注册表。

## 作者与许可

作者 **YSKM523** · [MIT License](LICENSE)
