import { describe, expect, it } from 'vitest';
import { generateStaticParams } from './page';
import { allResourceItems } from '@/content/resources';

describe('ResourceDetailPage', () => {
  it('generates one static route per resource that has a body', () => {
    const params = generateStaticParams();
    const withBody = allResourceItems.filter((item) => item.body);

    expect(params).toHaveLength(withBody.length);
    expect(params).toContainEqual({ id: 'cheat-error-tree' });
  });
});
