#!/usr/bin/env node
/**
 * 为 judgeMode === 'stdout' 的练习生成 expectedStdout。
 *
 * 用法：
 *   node scripts/gen-expected.mjs            # 全部 stdout 题
 *   node scripts/gen-expected.mjs m1-01 m1-04 # 只跑指定题目
 *
 * 做法：用 esbuild 把 TS 内容打成一份临时 ESM 就地加载（仓库里没有 tsx，
 * esbuild 已是 devDependency），然后串行调用官方 Rust Playground 编译运行
 * solutionCode，把真实 stdout 打印成 JSON 转义形式，方便粘回内容文件。
 *
 * 对 Playground 保持礼貌：串行 + 每次请求间隔 >= 1.2s。
 */
import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAYGROUND_URL = 'https://play.rust-lang.org/execute';
const MIN_INTERVAL_MS = 1200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadExercises() {
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, 'content/exercises/index.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    alias: { '@': ROOT },
  });
  const code = result.outputFiles[0].text;
  const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  const mod = await import(dataUrl);
  return mod.allExercises;
}

async function runOnPlayground(code, { tests = false, crateType = 'bin' } = {}) {
  const response = await fetch(PLAYGROUND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'stable',
      mode: 'debug',
      edition: '2024',
      crateType,
      tests,
      code,
      backtrace: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Playground HTTP ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function main() {
  const only = new Set(process.argv.slice(2));
  const allExercises = await loadExercises();
  const targets = allExercises.filter(
    (exercise) =>
      exercise.judgeMode === 'stdout' && (only.size === 0 || only.has(exercise.id)),
  );

  if (targets.length === 0) {
    console.error('没有匹配的 stdout 练习。');
    process.exit(1);
  }

  console.log(`将为 ${targets.length} 道 stdout 练习生成 expectedStdout…\n`);

  for (const [index, exercise] of targets.entries()) {
    if (index > 0) await sleep(MIN_INTERVAL_MS);

    const result = await runOnPlayground(exercise.solutionCode, {
      tests: false,
      crateType: exercise.crateType ?? 'bin',
    });

    if (!result.success) {
      console.error(`\n[${exercise.id}] 参考答案编译/运行失败：\n`);
      console.error(result.stderr ?? '(无 stderr)');
      process.exit(1);
    }

    console.log(`--- ${exercise.id}  ${exercise.title}`);
    console.log(result.stdout.replace(/\n$/, ''));
    console.log(`expectedStdout: ${JSON.stringify(result.stdout)}\n`);
  }

  console.log('全部生成完毕，请把上面的 expectedStdout 粘回内容文件。');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
