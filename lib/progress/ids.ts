import { getExerciseById } from '@/content/exercises';
import { getChecklistItemById } from '@/content/projects';

/**
 * 练习 id（'m1-01'）与项目验收清单项 id（'p1-01'）共用同一个进度命名空间。
 * 任何写入/回传进度的接口都必须用这里的白名单，别各自再查一遍——
 * 曾因 sync 路由只查 getExerciseById，导致 43 条清单勾选被过滤掉后又被 setAll 覆盖清空。
 */
export function isKnownProgressId(id: string): boolean {
  if (!id) return false;
  return Boolean(getExerciseById(id) ?? getChecklistItemById(id));
}

/** 从不可信输入里筛出合法进度 id（非数组一律得空数组）。 */
export function filterKnownProgressIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((x): x is string => typeof x === 'string' && isKnownProgressId(x));
}
