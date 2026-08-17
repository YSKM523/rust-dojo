import { describe, it, expect } from 'vitest';
import { isKnownProgressId, filterKnownProgressIds } from '@/lib/progress/ids';
import { allExercises } from '@/content/exercises';
import { allProjects } from '@/content/projects';

const someExerciseId = allExercises[0].id;
const someChecklistId = allProjects[0].items[0].id;

describe('isKnownProgressId', () => {
  it('认识练习 id', () => {
    expect(isKnownProgressId(someExerciseId)).toBe(true);
  });

  // 回归：项目验收清单项与练习共用同一个进度命名空间，
  // 曾因 sync 路由只查 getExerciseById 而把 p1-xx 全部丢弃。
  it('认识项目验收清单 id', () => {
    expect(isKnownProgressId(someChecklistId)).toBe(true);
  });

  it('拒绝未知 id', () => {
    expect(isKnownProgressId('m9-99')).toBe(false);
    expect(isKnownProgressId('')).toBe(false);
  });
});

describe('filterKnownProgressIds', () => {
  it('保留练习与清单 id，丢掉垃圾', () => {
    const out = filterKnownProgressIds([someExerciseId, someChecklistId, 'nope', 42, null]);
    expect(out).toEqual([someExerciseId, someChecklistId]);
  });

  it('全部 43 条清单 id 都能通过', () => {
    const checklistIds = allProjects.flatMap((p) => p.items.map((i) => i.id));
    expect(filterKnownProgressIds(checklistIds)).toEqual(checklistIds);
  });

  it('非数组输入返回空数组', () => {
    expect(filterKnownProgressIds(undefined)).toEqual([]);
    expect(filterKnownProgressIds('m1-01')).toEqual([]);
  });
});
