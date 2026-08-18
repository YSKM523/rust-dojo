#!/usr/bin/env node
/**
 * Phase B 静态资源构建：一条 `npm run assets` 产出 assets-dist/assets/。
 *
 *   assets-dist/assets/site.css        Tailwind v4 CLI 编译 islands/site.css（扫描 Rust 模板 + islands）
 *   assets-dist/assets/js/*.js         esbuild 打包每个 island 入口（ESM，零框架，alias @ -> 仓库根）
 *   assets-dist/assets/fonts/*.woff2   自托管字体（latin subset），替代 next/font
 *   assets-dist/favicon.ico            现有站点 favicon
 *   assets-dist/icon.png               512x512 app icon
 *   assets-dist/apple-icon.png         180x180 Apple touch icon
 *   assets-dist/hero-blueprint.webp     首页 hero 蓝图背景
 *
 * 产物整目录 gitignore；Worker 侧由 wrangler assets(directory=../../assets-dist) 挂到站点根，
 * CSS/island/font 统一挂在 /assets/ 下；Next 文件约定的三枚图标保留站点根 URL。
 *
 * 依赖说明：走 npm 包 @tailwindcss/cli（官方 CLI，与已装的 tailwindcss 同版本，不引第二份
 * Tailwind），而不是 postcss 编程调用 —— 少一层胶水，且与 spec §6「Tailwind v4 standalone CLI」一致。
 *
 * 用 node >= 20 跑（本机默认 node 18 跑不动新工具链）：
 *   PATH=~/.nvm/versions/node/v22.22.2/bin:$PATH npm run assets
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_ROOT = path.join(ROOT, 'assets-dist');
const OUT = path.join(OUT_ROOT, 'assets');
const OUT_JS = path.join(OUT, 'js');
const OUT_FONTS = path.join(OUT, 'fonts');
const CSS_ENTRY = path.join(ROOT, 'islands', 'site.css');
const TEMPLATES_DIR = path.join(ROOT, 'workers', 'api', 'templates');
const FAVICON_SOURCE = path.join(ROOT, 'app', 'favicon.ico');
const FAVICON_OUT = path.join(OUT_ROOT, 'favicon.ico');
const APP_ICONS = ['icon.png', 'apple-icon.png'];
const PUBLIC_ROOT_FILES = ['hero-blueprint.webp'];

/**
 * island 入口 = islands/ 下所有 .ts（文件名即产物名：assets-dist/assets/js/<name>.js）。
 * 约定：以 `_` 开头的文件是共享片段不是入口；`*.test.ts` / `*.d.ts` 同样跳过。
 * 用 glob 而不是写死清单，Task 8/12 加 island 时不用回来改这个脚本。
 */
function islandEntries() {
  return readdirSync(path.join(ROOT, 'islands'))
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts') && !f.endsWith('.test.ts'))
    .filter((f) => !f.startsWith('_'))
    .map((f) => f.slice(0, -3))
    .sort();
}

/**
 * 字体来源：npm @fontsource-variable/*（SIL OFL），取 latin subset 的 **可变字体**
 * （wght 轴 100–900），与现网 next/font 从 Google 拿到的可变字体口径一致：
 * 一个文件覆盖 font-medium/semibold/bold/black 全部字重，不靠浏览器合成加粗。
 */
const FONT_FILES = [
  '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2',
];

/** 字体体积下限：两个 latin 可变子集分别是 48 256 B / 23 128 B，10 KB 门槛有充足余量。 */
const MIN_FONT_BYTES = 10 * 1024;

/** 可变字体必须声明 wght 区间，漏了就退化成单一字重。 */
const WEIGHT_RANGE_RE = /font-weight:\s*100\s+900/g;

function log(step, msg) {
  console.log(`[assets] ${step}: ${msg}`);
}

async function clean() {
  await rm(OUT_ROOT, { recursive: true, force: true });
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

async function buildJs(entries) {
  const result = await esbuild.build({
    entryPoints: entries.map((name) => path.join(ROOT, 'islands', `${name}.ts`)),
    outdir: OUT_JS,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    legalComments: 'none',
    logLevel: 'warning',
    // code splitting 是硬要求，不是体积优化：lib/progress/store.ts 是**带状态的单例**
    // （cache + listeners）。不拆的话每个 island bundle 各自内联一份 store，
    // exercise/checklist 里 markCompleted() 写的是自己那份，同页 progress-badge
    // 的 listener 根本不在同一个 Set 里，徽章不会更新。开 splitting 后共享模块被提到
    // chunks/ 下，各 entry import 同一个 URL，浏览器保证只求值一次 = 真单例。
    splitting: true,
    chunkNames: 'chunks/[name]-[hash]',
    // tsconfig 的 paths: { "@/*": ["./*"] } —— islands 直接 import 现有零框架 TS，不分叉。
    alias: { '@': ROOT },
  });
  if (result.errors.length) throw new Error('esbuild 失败');
  const chunks = existsSync(path.join(OUT_JS, 'chunks'))
    ? readdirSync(path.join(OUT_JS, 'chunks')).length
    : 0;
  log('js', `${entries.map((n) => `${n}.js`).join(', ')}${chunks ? ` (+${chunks} shared chunk)` : ''}`);
}

async function copyFonts() {
  for (const rel of FONT_FILES) {
    const from = path.join(ROOT, 'node_modules', ...rel.split('/'));
    if (!existsSync(from)) throw new Error(`缺少字体源文件：${rel}（npm i）`);
    await copyFile(from, path.join(OUT_FONTS, path.basename(rel)));
  }
  log('fonts', `${FONT_FILES.length} woff2 -> assets-dist/assets/fonts/`);
}

async function copyStaticIcons() {
  await copyFile(FAVICON_SOURCE, FAVICON_OUT);
  for (const name of APP_ICONS) {
    await copyFile(path.join(ROOT, 'app', name), path.join(OUT_ROOT, name));
  }
  log('icons', `app/{favicon.ico,${APP_ICONS.join(',')}} -> assets-dist/`);
  for (const name of PUBLIC_ROOT_FILES) {
    await copyFile(path.join(ROOT, 'public', name), path.join(OUT_ROOT, name));
  }
  log('public', `${PUBLIC_ROOT_FILES.join(', ')} -> assets-dist/`);
}

/* ------------------------------------------------------------------ */
/* 自检：构建完立刻按契约断言产物，红了直接非零退出                       */
/* ------------------------------------------------------------------ */
async function selfCheck(entries) {
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

    // 可变字体：每条 @font-face 都要声明 wght 区间 100–900，否则退化成单一字重。
    const ranges = css.match(WEIGHT_RANGE_RE) ?? [];
    if (ranges.length >= FONT_FILES.length) ok('@font-face 声明 font-weight 100 900', `${ranges.length} 条`);
    else bad('@font-face 声明 font-weight 100 900', `只有 ${ranges.length} 条，期望 >= ${FONT_FILES.length}`);

    for (const f of FONT_FILES) {
      const base = path.basename(f);
      if (css.includes(`/assets/fonts/${base}`)) ok(`site.css 引用 ${base}`, '');
      else bad(`site.css 引用 ${base}`, '未在 CSS 里出现');
    }

    // minify 会把属性选择器的引号去掉（[data-theme=dark]），两种写法都认。
    if (/\[data-theme=["']?dark["']?\]/.test(css)) ok('site.css 含暗色主题块', '[data-theme=dark]');
    else bad('site.css 含暗色主题块', '缺 [data-theme=dark]');
  }

  // 2) 每个 island 入口产物存在；入口与 shared chunk 都不许含 react
  const jsFiles = [];
  const walk = async (dir, prefix) => {
    for (const name of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, name.name);
      if (name.isDirectory()) await walk(full, `${prefix}${name.name}/`);
      else if (name.name.endsWith('.js')) jsFiles.push({ rel: `${prefix}${name.name}`, full });
    }
  };
  await walk(OUT_JS, '');

  for (const name of entries) {
    if (existsSync(path.join(OUT_JS, `${name}.js`))) ok(`js/${name}.js 存在`, '');
    else bad(`js/${name}.js 存在`, '缺产物');
  }
  for (const { rel, full } of jsFiles) {
    const js = await readFile(full, 'utf8');
    const size = (await stat(full)).size;
    if (/react/i.test(js)) bad(`js/${rel} 无 react`, '打进了 react');
    else ok(`js/${rel} 无 react`, `${size} B`);
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

  if (existsSync(FAVICON_OUT) && (await stat(FAVICON_OUT)).size > 0) {
    ok('favicon.ico 存在', `${(await stat(FAVICON_OUT)).size} B`);
  } else {
    bad('favicon.ico 存在', FAVICON_OUT);
  }
  for (const name of APP_ICONS) {
    const iconPath = path.join(OUT_ROOT, name);
    if (existsSync(iconPath) && (await stat(iconPath)).size > 0) {
      ok(`${name} 存在`, `${(await stat(iconPath)).size} B`);
    } else {
      bad(`${name} 存在`, iconPath);
    }
  }
  for (const name of PUBLIC_ROOT_FILES) {
    const publicPath = path.join(OUT_ROOT, name);
    if (existsSync(publicPath) && (await stat(publicPath)).size > 0) {
      ok(`${name} 存在`, `${(await stat(publicPath)).size} B`);
    } else {
      bad(`${name} 存在`, publicPath);
    }
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
  const entries = islandEntries();
  await clean();
  buildCss();
  await buildJs(entries);
  await copyFonts();
  await copyStaticIcons();
  await selfCheck(entries);
}

await main();
