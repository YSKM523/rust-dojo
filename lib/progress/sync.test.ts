// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapSync } from '@/lib/progress/sync';
import { clearProgress, getCompleted, markCompleted, setAuthed } from '@/lib/progress/store';

beforeEach(() => {
  localStorage.clear();
  clearProgress();
  setAuthed(false);
  vi.unstubAllGlobals();
});

describe('bootstrapSync', () => {
  it('does not call progress sync when auth check says visitor', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        calls.push(url);
        return Promise.resolve(new Response(JSON.stringify({ user: null }), { status: 200 }));
      }),
    );

    await bootstrapSync();

    expect(calls).toEqual(['/api/auth/me']);
  });

  it('syncs progress only after auth check confirms a user', async () => {
    const calls: string[] = [];
    markCompleted('m1-01');
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        calls.push(url);
        if (url === '/api/auth/me') {
          return Promise.resolve(
            new Response(JSON.stringify({ user: { email: 'a@example.com' } }), { status: 200 }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ ids: ['m1-01', 'm2-01'] }), { status: 200 }),
        );
      }),
    );

    await bootstrapSync();

    expect(calls).toEqual(['/api/auth/me', '/api/progress/sync']);
    expect(getCompleted().sort()).toEqual(['m1-01', 'm2-01']);
  });
});
