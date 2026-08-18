#!/usr/bin/env node
// 从 TS 内容生成两份 Rust worker 编译期内嵌（include_str!）的 JSON：
//   1. workers/api/manifest.json    —— progressIds 白名单 + AI 上下文（Phase A 契约，保持不变）
//   2. workers/api/site-content.json —— Phase B SSR 全量内容（modules/exercises/projects/resources）
// 内容是 TS 单一事实源，改完内容必须重跑本脚本；content/manifest-sync.test.ts 是防漂移闸门。
import * as esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadModule(entry) {
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true, write: false, format: 'esm', platform: 'node',
    target: 'node20', alias: { '@': ROOT },
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`;
  return import(dataUrl);
}

const { allModules } = await loadModule('content/modules/index.ts');
const { allExercises } = await loadModule('content/exercises/index.ts');
const { allProjects } = await loadModule('content/projects.ts');
const { resourceGroups, featuredResources, scenarioCards } = await loadModule('content/resources.ts');

// 排除式变换：整体保留内容对象的全部字段，只显式删掉点名的键。
// **不要改成挑选式白名单**——内容模型将来新增合法公开字段时，白名单会静默漏掉它，
// 而守卫测试若也照抄同一份白名单就会一起漏，产物缺字段测试却是绿的（假绿）。
const omit = (obj, ...keys) => {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
};

// ---- 1. manifest.json（Phase A 契约，逐字不变）----------------------------
const exerciseIds = allExercises.map((e) => e.id);
const checklistIds = allProjects.flatMap((p) => p.items.map((i) => i.id));
const manifest = {
  progressIds: [...exerciseIds, ...checklistIds],
  exercises: Object.fromEntries(allExercises.map((e) => [e.id, { title: e.title, prompt: e.prompt }])),
};

const manifestOut = path.join(ROOT, 'workers/api/manifest.json');
fs.mkdirSync(path.dirname(manifestOut), { recursive: true });
fs.writeFileSync(manifestOut, JSON.stringify(manifest, null, 1) + '\n');
console.log(`manifest: ${manifest.progressIds.length} progressIds (${exerciseIds.length} exercises + ${checklistIds.length} checklist), ${Object.keys(manifest.exercises).length} exercise entries`);

// ---- 2. site-content.json（Phase B SSR 内容）------------------------------
// 练习**必须**剔除 solutionCode；判题字段统一收进 judge 子对象，供 Rust SSR
// 按 island 协议挑选字段内联。其余内容按原对象整体透传（含将来新增的字段），
// 只有这里点名的键会被移动或删除。
const EXERCISE_JUDGE_KEYS = [
  'judgeMode',
  'expectedStdout',
  'hiddenTests',
  'assertSource',
  'crateType',
];

const withNestedJudge = (exercise) => ({
  ...omit(exercise, 'solutionCode', ...EXERCISE_JUDGE_KEYS),
  judge: Object.fromEntries(
    EXERCISE_JUDGE_KEYS.flatMap((key) => exercise[key] === undefined ? [] : [[key, exercise[key]]]),
  ),
});

const siteContent = {
  modules: allModules.map((m) => ({ ...m })),
  exercises: allExercises.map(withNestedJudge),
  projects: allProjects.map((p) => ({ ...p, items: p.items.map((i) => ({ ...i })) })),
  resources: resourceGroups.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i })) })),
  featuredResourceIds: featuredResources.map((i) => i.id),
  scenarioCards: scenarioCards.map((c) => ({ ...c })),
};

const siteContentOut = path.join(ROOT, 'workers/api/site-content.json');
fs.writeFileSync(siteContentOut, JSON.stringify(siteContent, null, 1) + '\n');
const resourceItemCount = siteContent.resources.reduce((n, g) => n + g.items.length, 0);
console.log(`site-content: ${siteContent.modules.length} modules, ${siteContent.exercises.length} exercises, ${siteContent.projects.length} projects, ${siteContent.resources.length} resource groups (${resourceItemCount} items), ${siteContent.scenarioCards.length} scenario cards`);
