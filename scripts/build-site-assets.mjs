#!/usr/bin/env node
/**
 * Phase B 静态资源构建：一条 `npm run assets` 产出 assets-dist/。
 *
 *   assets-dist/site.css        Tailwind v4 CLI 编译 islands/site.css（扫描 Rust 模板 + islands）
 *   assets-dist/js/*.js         esbuild 打包每个 island 入口（ESM，零框架，alias @ -> 仓库根）
 *   assets-dist/fonts/*.woff2   自托管字体（latin subset），替代 next/font
 *
 * 产物整目录 gitignore；Worker 侧由 wrangler assets(directory=../../assets-dist) 挂到站点根，
 * 所以 CSS 里字体用绝对路径 /fonts/xxx.woff2。
 *
 * 依赖说明：走 npm 包 @tailwindcss/cli（官方 CLI，与已装的 tailwindcss 同版本，不引第二份
 * Tailwind），而不是 postcss 编程调用 —— 少一层胶水，且与 spec §6「Tailwind v4 standalone CLI」一致。
 *
 * 用 node >= 20 跑（本机默认 node 18 跑不动新工具链）：
 *   PATH=~/.nvm/versions/node/v22.22.2/bin:$PATH npm run assets
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets-dist');
const OUT_JS = path.join(OUT, 'js');
const OUT_FONTS = path.join(OUT, 'fonts');
const CSS_ENTRY = path.join(ROOT, 'islands', 'site.css');
const TEMPLATES_DIR = path.join(ROOT, 'workers', 'api', 'templates');

/** island 入口（文件名即产物名：assets-dist/js/<name>.js） */
const ISLAND_ENTRIES = ['theme', 'progress-badge', 'fx'];

/**
 * 字体来源：npm @fontsource/*（SIL OFL），取 latin subset 的静态字重 woff2。
 * Inter 400/500/600/700 + Geist Mono 400 —— 覆盖 app/globals.css 里 font-sans/font-mono
 * 实际用到的字重（black/900 由 Inter 700 + 合成加粗回退，与 next/font 的 latin 子集口径一致）。
 */
const FONT_FILES = [
  '@fontsource/inter/files/inter-latin-400-normal.woff2',
  '@fontsource/inter/files/inter-latin-500-normal.woff2',
  '@fontsource/inter/files/inter-latin-600-normal.woff2',
  '@fontsource/inter/files/inter-latin-700-normal.woff2',
  '@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2',
];

/**
 * 字体体积下限。Geist Mono latin-400 的真身是 9 864 B（≈9.6 KB），
 * 所以门槛取 8 KB 而不是 10 KB —— 10 KB 会把一个完全正确的 subset 判红。
 */
const MIN_FONT_BYTES = 8 * 1024;

function log(step, msg) {
  console.log(`[assets] ${step}: ${msg}`);
}

async function clean() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT_JS, { recursive: true });
  await mkdir(OUT_FONTS, { recursive: true });
  // islands/site.css 的 @source 指向模板目录；目录不存在会让 Tailwind 报错，
  // 而 Task 3 之前它本来就是空的，先兜底建出来。
  await mkdir(TEMPLATES_DIR, { recursive: true });
}

function buildCss() {
  const cli = path.join(ROOT, 'node_modules', '@tailwindcss', 'cli', 'dist', 'index.mjs');
  if (!existsSync(cli)) throw new Error(`缺少 @tailwindcss/cli：${cli}（npm i）`);
  const out = path.join(OUT, 'site.css');
  // 用 process.execPath 而不是 .bin 里的 shebang，保证跟本脚本同一个 node。
  const r = spawnSync(process.execPath, [cli, '--input', CSS_ENTRY, '--output', out, '--minify'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (r.status !== 0) throw new Error(`tailwindcss CLI 失败（exit ${r.status}）`);
  log('css', path.relative(ROOT, out));
}

async function buildJs() {
  const result = await esbuild.build({
    entryPoints: ISLAND_ENTRIES.map((name) => path.join(ROOT, 'islands', `${name}.ts`)),
    outdir: OUT_JS,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    legalComments: 'none',
    logLevel: 'warning',
    // tsconfig 的 paths: { "@/*": ["./*"] } —— islands 直接 import 现有零框架 TS，不分叉。
    alias: { '@': ROOT },
  });
  if (result.errors.length) throw new Error('esbuild 失败');
  log('js', ISLAND_ENTRIES.map((n) => `${n}.js`).join(', '));
}

async function copyFonts() {
  for (const rel of FONT_FILES) {
    const from = path.join(ROOT, 'node_modules', ...rel.split('/'));
    if (!existsSync(from)) throw new Error(`缺少字体源文件：${rel}（npm i）`);
    await copyFile(from, path.join(OUT_FONTS, path.basename(rel)));
  }
  log('fonts', `${FONT_FILES.length} woff2 -> assets-dist/fonts/`);
}

/* ------------------------------------------------------------------ */
/* 自检：构建完立刻按契约断言产物，红了直接非零退出                       */
/* ------------------------------------------------------------------ */
async function selfCheck() {
  const checks = [];
  const ok = (name, detail) => checks.push({ pass: true, name, detail });
  const bad = (name, detail) => checks.push({ pass: false, name, detail });

  // 1) site.css 存在 + 含 brand token + 含 @font-face
  const cssPath = path.join(OUT, 'site.css');
  if (!existsSync(cssPath)) {
    bad('site.css 存在', cssPath);
  } else {
    const css = await readFile(cssPath, 'utf8');
    ok('site.css 存在', `${(css.length / 1024).toFixed(1)} KB`);

    // 注意：globals.css 用的是 `@theme inline`，Tailwind v4 会把 --color-* 直接内联成
    // 底层 token（.text-brand { color: var(--brand) }），产物里不会出现 --color-brand 这个名字。
    // 所以 brand token 的断言接受两种形态，命中哪种会打印出来。
    const hasColorBrand = /--color-brand\s*:/.test(css);
    const hasBrand = /--brand\s*:\s*#/.test(css);
    if (hasColorBrand || hasBrand) {
      ok('site.css 含 brand token', hasColorBrand ? '--color-brand' : '--brand (@theme inline 内联)');
    } else {
      bad('site.css 含 brand token', '既无 --color-brand 也无 --brand');
    }

    const faces = css.match(/@font-face/g) ?? [];
    if (faces.length >= FONT_FILES.length) ok('site.css 含 @font-face', `${faces.length} 条`);
    else bad('site.css 含 @font-face', `只有 ${faces.length} 条，期望 >= ${FONT_FILES.length}`);

    // minify 会把属性选择器的引号去掉（[data-theme=dark]），两种写法都认。
    if (/\[data-theme=["']?dark["']?\]/.test(css)) ok('site.css 含暗色主题块', '[data-theme=dark]');
    else bad('site.css 含暗色主题块', '缺 [data-theme=dark]');
  }

  // 2) 每个 island 产物存在且不含 react
  for (const name of ISLAND_ENTRIES) {
    const p = path.join(OUT_JS, `${name}.js`);
    if (!existsSync(p)) {
      bad(`js/${name}.js 存在`, p);
      continue;
    }
    const js = await readFile(p, 'utf8');
    const size = (await stat(p)).size;
    if (/react/i.test(js)) bad(`js/${name}.js 无 react`, '打进了 react');
    else ok(`js/${name}.js 无 react`, `${size} B`);
  }

  // 3) 字体就位且不是空壳
  const fonts = (await readdir(OUT_FONTS)).filter((f) => f.endsWith('.woff2'));
  if (fonts.length !== FONT_FILES.length) {
    bad('fonts/*.woff2 数量', `${fonts.length} != ${FONT_FILES.length}`);
  } else {
    ok('fonts/*.woff2 数量', String(fonts.length));
  }
  for (const f of fonts.sort()) {
    const size = (await stat(path.join(OUT_FONTS, f))).size;
    if (size > MIN_FONT_BYTES) ok(`fonts/${f} > ${MIN_FONT_BYTES} B`, `${size} B`);
    else bad(`fonts/${f} > ${MIN_FONT_BYTES} B`, `${size} B`);
  }

  console.log('\n[assets] self-check');
  for (const c of checks) {
    console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  (${c.detail})` : ''}`);
  }
  const failed = checks.filter((c) => !c.pass);
  console.log(`[assets] self-check: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

async function main() {
  await clean();
  buildCss();
  await buildJs();
  await copyFonts();
  await selfCheck();
}

await main();
