import { describe, it, expect } from 'vitest';
import { exerciseNav } from '@/content/exercises';

describe('exerciseNav', () => {
  it('empty content has no navigation entry', () => {
    expect(exerciseNav('m1-01')).toBeUndefined();
  });
});
