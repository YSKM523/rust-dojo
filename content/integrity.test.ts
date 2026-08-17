import { describe, expect, it } from 'vitest';
import { allExercises, exercisesByModule, getExerciseById } from '@/content/exercises';
import { allModules, getModuleById } from '@/content/modules';
import { allProjects } from '@/content/projects';

describe('content integrity', () => {
  it('练习 id 唯一且形如 m1-01', () => {
    const ids = allExercises.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id, id).toMatch(/^m\d+-\d{2}$/);
    }
  });

  it('每道练习的 moduleId 都对应一个已定义的模块', () => {
    const moduleIds = new Set(allModules.map((module) => module.id));
    for (const exercise of allExercises) {
      expect(moduleIds.has(exercise.moduleId), `${exercise.id} -> ${exercise.moduleId}`).toBe(true);
    }
  });

  it('练习 id 前缀与所属模块一致', () => {
    for (const exercise of allExercises) {
      expect(exercise.id.split('-')[0], exercise.id).toBe(exercise.moduleId);
    }
  });

  it('stdout 题必须有非空 expectedStdout', () => {
    for (const exercise of allExercises.filter((e) => e.judgeMode === 'stdout')) {
      expect(exercise.expectedStdout ?? '', exercise.id).not.toBe('');
    }
  });

  it('tests 题必须带 hiddenTests，且包含 #[test]', () => {
    for (const exercise of allExercises.filter((e) => e.judgeMode === 'tests')) {
      expect(exercise.hiddenTests ?? '', exercise.id).toContain('#[test]');
      expect(exercise.hiddenTests ?? '', exercise.id).toContain('#[cfg(test)]');
    }
  });

  // compile 题允许带 expectedStdout（带了就同时比对输出，堵住空 main 过关）；
  // tests 题的输出由隐藏测试决定，不该再有 expectedStdout。
  it('tests 题不带 expectedStdout，非 tests 题不带 hiddenTests', () => {
    for (const exercise of allExercises) {
      if (exercise.judgeMode === 'tests') {
        expect(exercise.expectedStdout, exercise.id).toBeUndefined();
      }
      if (exercise.judgeMode !== 'tests') {
        expect(exercise.hiddenTests, exercise.id).toBeUndefined();
      }
    }
  });

  it('compile 题必须有加固：expectedStdout 或 assertSource 至少其一', () => {
    for (const exercise of allExercises) {
      if (exercise.judgeMode !== 'compile') continue;
      const guarded =
        (exercise.expectedStdout ?? '') !== '' || (exercise.assertSource ?? '').trim() !== '';
      expect(guarded, `${exercise.id} 只判 run.success，空 main 也能过`).toBe(true);
    }
  });

  it('starterCode 与 solutionCode 不相同，且都非空', () => {
    for (const exercise of allExercises) {
      expect(exercise.starterCode.trim(), exercise.id).not.toBe('');
      expect(exercise.solutionCode.trim(), exercise.id).not.toBe('');
      expect(exercise.starterCode, exercise.id).not.toBe(exercise.solutionCode);
    }
  });

  it('难度在 1–5 之间', () => {
    for (const exercise of allExercises) {
      expect(exercise.difficulty, exercise.id).toBeGreaterThanOrEqual(1);
      expect(exercise.difficulty, exercise.id).toBeLessThanOrEqual(5);
    }
  });

  it('每道练习都有标题与题面', () => {
    for (const exercise of allExercises) {
      expect(exercise.title.trim(), exercise.id).not.toBe('');
      expect(exercise.prompt.trim().length, exercise.id).toBeGreaterThan(20);
    }
  });

  it('模块 id 唯一、order 唯一且升序、字段完整', () => {
    const ids = allModules.map((module) => module.id);
    expect(new Set(ids).size).toBe(ids.length);

    const orders = allModules.map((module) => module.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));

    for (const module of allModules) {
      expect(module.title.trim(), module.id).not.toBe('');
      expect(module.tierLabel.trim(), module.id).not.toBe('');
      expect(module.summary.trim(), module.id).not.toBe('');
      expect(module.lesson.trim().length, module.id).toBeGreaterThan(100);
    }
  });

  it('getModuleById / getExerciseById 查得到已知项，查不到返回 undefined', () => {
    for (const module of allModules) {
      expect(getModuleById(module.id)?.id).toBe(module.id);
    }
    for (const exercise of allExercises) {
      expect(getExerciseById(exercise.id)?.id).toBe(exercise.id);
    }
    expect(getModuleById('nope')).toBeUndefined();
    expect(getExerciseById('nope')).toBeUndefined();
  });

  it('exercisesByModule 过滤正确', () => {
    for (const module of allModules) {
      expect(exercisesByModule(module.id).every((e) => e.moduleId === module.id)).toBe(true);
    }
    expect(exercisesByModule('nope')).toEqual([]);
  });

  it('项目 id 形如 p1、清单项 id 形如 p1-01，且 afterModuleId 存在', () => {
    const moduleIds = new Set(allModules.map((module) => module.id));
    const projectIds = allProjects.map((project) => project.id);
    expect(new Set(projectIds).size).toBe(projectIds.length);

    for (const project of allProjects) {
      expect(project.id, project.id).toMatch(/^p\d+$/);
      expect(
        moduleIds.has(project.afterModuleId),
        `${project.id} -> ${project.afterModuleId}`,
      ).toBe(true);
      for (const item of project.items) {
        expect(item.id, item.id).toMatch(/^p\d+-\d{2}$/);
        expect(item.id.split('-')[0], item.id).toBe(project.id);
        expect(item.text.trim(), item.id).not.toBe('');
      }
    }
  });

  it('清单项 id 与练习 id 共用进度命名空间但互不冲突', () => {
    const exerciseIds = new Set(allExercises.map((exercise) => exercise.id));
    const itemIds = allProjects.flatMap((project) => project.items.map((item) => item.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    for (const id of itemIds) {
      expect(exerciseIds.has(id), id).toBe(false);
    }
  });
});
