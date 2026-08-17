import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { allExercises } from '@/content/exercises';
import { allProjects } from '@/content/projects';

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
