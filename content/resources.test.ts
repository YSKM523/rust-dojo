import { describe, expect, it } from 'vitest';
import {
  allResourceItems,
  featuredResources,
  getResourceById,
  resourceGroups,
  scenarioCards,
} from '@/content/resources';

describe('resources content', () => {
  it('ships the three job-hunting groups', () => {
    expect(resourceGroups.map((group) => group.id)).toEqual(['jd', 'interview', 'cheatsheet']);
    expect(resourceGroups.find((group) => group.id === 'interview')!.items.length).toBeGreaterThanOrEqual(8);
    expect(resourceGroups.find((group) => group.id === 'jd')!.items.length).toBeGreaterThanOrEqual(8);
    expect(resourceGroups.find((group) => group.id === 'cheatsheet')!.items.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps resource ids unique and every item readable', () => {
    const ids = allResourceItems.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const item of allResourceItems) {
      expect(item.title.length, item.id).toBeGreaterThan(0);
      expect(item.summary.length, item.id).toBeGreaterThan(0);
      expect(item.tags.length, item.id).toBeGreaterThan(0);
      expect(item.body, item.id).toBeTruthy();
    }
  });

  it('cross-references only well-formed module, exercise and project ids', () => {
    for (const item of allResourceItems) {
      if (item.moduleId) expect(item.moduleId, item.id).toMatch(/^m[1-8]$/);
      if (item.projectId) expect(item.projectId, item.id).toMatch(/^p[1-4]$/);
      if (item.exerciseId) expect(item.exerciseId, item.id).toMatch(/^m[1-8]-\d{2}$/);
    }
    for (const card of scenarioCards) {
      expect(card.moduleId).toMatch(/^m[1-8]$/);
    }
  });

  it('exposes featured items that resolve by id', () => {
    expect(featuredResources.length).toBeGreaterThanOrEqual(3);
    for (const item of featuredResources) {
      expect(getResourceById(item.id)).toBe(item);
    }
    expect(getResourceById('missing')).toBeUndefined();
  });
});
