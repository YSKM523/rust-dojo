import { describe, expect, it } from 'vitest';
import { allExercises } from '@/content/exercises';

describe.skipIf(!process.env.PLAYGROUND_TESTS)('exercise soundness placeholder', () => {
  it('accepts the empty bootstrap exercise collection', () => {
    expect(allExercises).toEqual([]);
  });
});
