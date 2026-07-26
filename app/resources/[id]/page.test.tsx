import { describe, expect, it } from 'vitest';
import { generateStaticParams } from './page';

describe('ResourceDetailPage', () => {
  it('has no static detail routes while resources are empty', () => {
    expect(generateStaticParams()).toEqual([]);
  });
});
