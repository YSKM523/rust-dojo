import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { allExercises } from '@/content/exercises';
import { allModules } from '@/content/modules';
import { allProjects } from '@/content/projects';
import { featuredResources, resourceGroups, scenarioCards } from '@/content/resources';

// workers/api/manifest.json 是 scripts/gen-manifest.mjs 的生成物，Rust worker 编译期内嵌。
// 内容变更后必须重跑生成脚本，否则 Rust 侧白名单/题面漂移——这条测试就是那道闸。
describe('workers/api/manifest.json 与内容同步', () => {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), 'workers/api/manifest.json'), 'utf8'),
  ) as { progressIds: string[]; exercises: Record<string, { title: string; prompt: string }> };

  it('progressIds = 全部练习 id + 全部清单 id（顺序一致）', () => {
    const expected = [
      ...allExercises.map((e) => e.id),
      ...allProjects.flatMap((p) => p.items.map((i) => i.id)),
    ];
    expect(manifest.progressIds).toEqual(expected);
  });

  it('exercises 条目与内容一致', () => {
    expect(Object.keys(manifest.exercises).sort()).toEqual(allExercises.map((e) => e.id).sort());
    for (const e of allExercises) {
      expect(manifest.exercises[e.id]).toEqual({ title: e.title, prompt: e.prompt });
    }
  });
});

// workers/api/site-content.json 是同一个生成脚本的第二产物，驱动 Phase B 的 Rust SSR 页面。
// 它必须与 TS 内容逐字段一致，且**绝不能**带上答案字段——这条测试同时守漂移和守泄漏。
//
// 期望值一律**从内容对象整体派生**（排除式：只删点名的答案键），不手工枚举字段白名单。
// 手工白名单会造成假绿：内容模型新增一个合法公开字段时，生成器和测试若各抄一份白名单，
// 产物漏掉该字段而测试依旧通过。这里 toEqual 直接比整个对象，新字段漏了就会红。
describe('workers/api/site-content.json 与内容同步', () => {
  const ANSWER_KEYS = ['solutionCode', 'hiddenTests', 'assertSource'] as const;

  const omitAnswers = (exercise: (typeof allExercises)[number]) => {
    const copy: Record<string, unknown> = { ...exercise };
    for (const key of ANSWER_KEYS) delete copy[key];
    return copy;
  };

  const raw = readFileSync(join(process.cwd(), 'workers/api/site-content.json'), 'utf8');
  const siteContent = JSON.parse(raw) as {
    modules: unknown[];
    exercises: Record<string, unknown>[];
    projects: unknown[];
    resources: unknown[];
    featuredResourceIds: string[];
    scenarioCards: unknown[];
  };

  it('exercises 条目不含 solutionCode / hiddenTests / assertSource（防答案泄漏）', () => {
    // 内容侧确实有这三个字段，否则这条断言等于空跑。
    expect(allExercises.some((e) => e.solutionCode !== undefined)).toBe(true);
    expect(allExercises.some((e) => e.hiddenTests !== undefined)).toBe(true);
    expect(allExercises.some((e) => e.assertSource !== undefined)).toBe(true);

    expect(siteContent.exercises).toHaveLength(allExercises.length);
    for (const entry of siteContent.exercises) {
      for (const key of ANSWER_KEYS) {
        expect(Object.keys(entry)).not.toContain(key);
        expect(entry[key]).toBeUndefined();
      }
    }
    // 整份文件里也不该出现这三个键（防未来嵌套结构把答案又带回来）。
    for (const key of ANSWER_KEYS) {
      expect(raw).not.toContain(`"${key}"`);
    }
  });

  it('modules 与内容逐字段一致（含 lesson 全文与任何新增字段）', () => {
    expect(siteContent.modules).toEqual(allModules);
  });

  it('exercises 与内容逐字段一致（仅剔除三个答案字段）', () => {
    expect(siteContent.exercises).toEqual(allExercises.map(omitAnswers));
  });

  it('projects 与内容逐字段一致（含 brief 与清单项）', () => {
    expect(siteContent.projects).toEqual(allProjects);
  });

  it('resources 分组与条目逐字段一致', () => {
    expect(siteContent.resources).toEqual(resourceGroups);
  });

  it('featuredResourceIds 与 scenarioCards 与内容一致', () => {
    expect(siteContent.featuredResourceIds).toEqual(featuredResources.map((i) => i.id));
    expect(siteContent.scenarioCards).toEqual(scenarioCards);
  });
});
