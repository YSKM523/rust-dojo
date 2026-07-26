import { describe, it, expect } from 'vitest';
import { exerciseNav, exercisesByModule } from '@/content/exercises';

describe('exerciseNav', () => {
  it('navigates within m1', () => {
    const total = exercisesByModule('m1').length;
    const nav = exerciseNav('m1-01');
    expect(nav).toBeDefined();
    expect(nav?.total).toBe(total);
    expect(nav?.nextId).toBe('m1-02');
  });
  it('returns undefined for unknown id', () => {
    expect(exerciseNav('nope')).toBeUndefined();
  });
});
