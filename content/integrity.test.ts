import { describe, expect, it } from 'vitest';
import { allExercises } from '@/content/exercises';
import { allModules } from '@/content/modules';
import { allProjects } from '@/content/projects';

describe('content integrity placeholder', () => {
  it('accepts the empty bootstrap content collections', () => {
    expect(allModules).toEqual([]);
    expect(allExercises).toEqual([]);
    expect(allProjects).toEqual([]);
  });
});
