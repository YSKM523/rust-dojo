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
