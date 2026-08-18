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
describe('workers/api/site-content.json 与内容同步', () => {
  const ANSWER_KEYS = ['solutionCode', 'hiddenTests', 'assertSource'] as const;

  const siteContent = JSON.parse(
    readFileSync(join(process.cwd(), 'workers/api/site-content.json'), 'utf8'),
  ) as {
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
    const raw = readFileSync(join(process.cwd(), 'workers/api/site-content.json'), 'utf8');
    for (const key of ANSWER_KEYS) {
      expect(raw).not.toContain(`"${key}"`);
    }
  });

  it('modules 与内容一致（含 lesson 全文）', () => {
    expect(siteContent.modules).toEqual(
      allModules.map((m) => ({
        id: m.id,
        order: m.order,
        title: m.title,
        tierKey: m.tierKey,
        tierLabel: m.tierLabel,
        summary: m.summary,
        lesson: m.lesson,
      })),
    );
  });

  it('exercises 与内容一致（除答案字段外全字段）', () => {
    expect(siteContent.exercises).toEqual(
      allExercises.map((e) => ({
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
    );
  });

  it('projects 与内容一致（含 brief 与清单项）', () => {
    expect(siteContent.projects).toEqual(
      allProjects.map((p) => ({
        id: p.id,
        afterModuleId: p.afterModuleId,
        title: p.title,
        summary: p.summary,
        brief: p.brief,
        items: p.items.map((i) => ({
          id: i.id,
          text: i.text,
          testCommand: i.testCommand,
          hint: i.hint,
        })),
      })),
    );
  });

  it('resources 分组与条目全字段一致', () => {
    expect(siteContent.resources).toEqual(
      resourceGroups.map((g) => ({
        id: g.id,
        title: g.title,
        eyebrow: g.eyebrow,
        summary: g.summary,
        items: g.items.map((i) => ({
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
    );
  });

  it('featuredResourceIds 与 scenarioCards 与内容一致', () => {
    expect(siteContent.featuredResourceIds).toEqual(featuredResources.map((i) => i.id));
    expect(siteContent.scenarioCards).toEqual(
      scenarioCards.map((c) => ({
        title: c.title,
        question: c.question,
        moduleId: c.moduleId,
        exerciseId: c.exerciseId,
        tags: c.tags,
      })),
    );
  });
});
