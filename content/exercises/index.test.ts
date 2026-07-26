import { describe, it, expect } from 'vitest';
import { allExercises, getExerciseById } from '@/content/exercises';

describe('exercise registry', () => {
  it('has registered exercises', () => {
    expect(allExercises.length).toBeGreaterThan(0);
  });
  it('resolves a known id', () => {
    expect(getExerciseById('m1-01')?.moduleId).toBe('m1');
  });
  it('returns undefined for unknown id', () => {
    expect(getExerciseById('nope')).toBeUndefined();
  });
});
