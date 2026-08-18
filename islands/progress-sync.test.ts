import { beforeEach, describe, expect, it, vi } from 'vitest';

const { bootstrapSync } = vi.hoisted(() => ({
  bootstrapSync: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/progress/sync', () => ({ bootstrapSync }));

describe('progress sync island', () => {
  beforeEach(() => {
    vi.resetModules();
    bootstrapSync.mockClear();
  });

  it('starts one sync when the module loads', async () => {
    await import('./progress-sync');

    expect(bootstrapSync).toHaveBeenCalledTimes(1);
  });
});
