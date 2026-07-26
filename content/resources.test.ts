import { describe, expect, it } from 'vitest';
import {
  allResourceItems,
  featuredResources,
  getResourceById,
  resourceGroups,
  scenarioCards,
} from '@/content/resources';

describe('resources content', () => {
  it('starts with empty resource collections', () => {
    expect(resourceGroups).toEqual([]);
    expect(featuredResources).toEqual([]);
    expect(allResourceItems).toEqual([]);
    expect(scenarioCards).toEqual([]);
    expect(getResourceById('missing')).toBeUndefined();
  });
});
