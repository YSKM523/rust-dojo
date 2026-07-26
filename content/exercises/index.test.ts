import { describe, it, expect } from 'vitest';
import { allExercises, getExerciseById } from '@/content/exercises';

describe('exercise registry', () => {
  it('starts empty for follow-up content tasks', () => {
    expect(allExercises).toEqual([]);
  });
  it('returns undefined for unknown id', () => {
    expect(getExerciseById('nope')).toBeUndefined();
  });
});
