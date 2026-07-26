# Rust 道场 · Rust Dojo

调用 Rust Playground 真实编译运行的中文 Rust 后端实战学习平台。

当前仓库是平台骨架：课程、练习、实战项目与判题引擎将在后续任务中接入。

## 技术栈

Next.js 16 (App Router) · TypeScript · Tailwind v4 · CodeMirror 6 · Vitest · Cloudflare Workers (OpenNext) · D1

## 本地开发

```bash
npm install
npm run dev
npm test
npx tsc --noEmit
```

## 内容契约

- `lib/rust/types.ts`：模块、练习、判题结果与实战项目的共享类型。
- `content/`：课程、练习、项目和学习资源注册表。

## 作者与许可

作者 **YSKM523** · [MIT License](LICENSE)
