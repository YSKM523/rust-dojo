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

async function loadModule(entry, exportNames) {
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

// 丢掉值为 undefined 的可选键，让产物与 JSON.stringify 语义一致、diff 稳定。
const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

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
// 练习**必须**剔除 solutionCode / hiddenTests / assertSource 三个答案字段：
// 这份 JSON 会被编进 Rust worker 并驱动页面渲染，答案不进入 SSR 面。
const siteContent = {
  modules: allModules.map((m) => compact({
    id: m.id,
    order: m.order,
    title: m.title,
    tierKey: m.tierKey,
    tierLabel: m.tierLabel,
    summary: m.summary,
    lesson: m.lesson,
  })),
  exercises: allExercises.map((e) => compact({
    id: e.id,
    moduleId: e.moduleId,
    title: e.title,
    difficulty: e.difficulty,
    prompt: e.prompt,
    starterCode: e.starterCode,
    judgeMode: e.judgeMode,
    expectedStdout: e.expectedStdout,
    crateType: e.crateType,
    hints: e.hints,
  })),
  projects: allProjects.map((p) => compact({
    id: p.id,
    afterModuleId: p.afterModuleId,
    title: p.title,
    summary: p.summary,
    brief: p.brief,
    items: p.items.map((i) => compact({
      id: i.id,
      text: i.text,
      testCommand: i.testCommand,
      hint: i.hint,
    })),
  })),
  resources: resourceGroups.map((g) => compact({
    id: g.id,
    title: g.title,
    eyebrow: g.eyebrow,
    summary: g.summary,
    items: g.items.map((i) => compact({
      id: i.id,
      kind: i.kind,
      title: i.title,
      summary: i.summary,
      category: i.category,
      level: i.level,
      tags: i.tags,
      moduleId: i.moduleId,
      exerciseId: i.exerciseId,
      projectId: i.projectId,
      readingTime: i.readingTime,
      body: i.body,
      code: i.code,
    })),
  })),
  featuredResourceIds: featuredResources.map((i) => i.id),
  scenarioCards: scenarioCards.map((c) => compact({
    title: c.title,
    question: c.question,
    moduleId: c.moduleId,
    exerciseId: c.exerciseId,
    tags: c.tags,
  })),
};

const siteContentOut = path.join(ROOT, 'workers/api/site-content.json');
fs.writeFileSync(siteContentOut, JSON.stringify(siteContent, null, 1) + '\n');
const resourceItemCount = siteContent.resources.reduce((n, g) => n + g.items.length, 0);
console.log(`site-content: ${siteContent.modules.length} modules, ${siteContent.exercises.length} exercises, ${siteContent.projects.length} projects, ${siteContent.resources.length} resource groups (${resourceItemCount} items), ${siteContent.scenarioCards.length} scenario cards`);
