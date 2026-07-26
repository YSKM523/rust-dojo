// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCompleted,
  isCompleted,
  markCompleted,
  clearProgress,
  subscribe,
  setAll,
  unmarkCompleted,
  setAuthed,
} from '@/lib/progress/store';

beforeEach(() => {
  localStorage.clear();
  clearProgress(); // 同时重置模块内缓存
});

describe('progress store', () => {
  it('初始为空', () => {
    expect(getCompleted()).toEqual([]);
    expect(isCompleted('m1-01')).toBe(false);
  });

  it('markCompleted 记录且去重', () => {
    markCompleted('m1-01');
    markCompleted('m1-01');
    markCompleted('m1-02');
    expect(getCompleted().sort()).toEqual(['m1-01', 'm1-02']);
    expect(isCompleted('m1-01')).toBe(true);
  });

  it('写入 localStorage 并能再读出', () => {
    markCompleted('m2-03');
    expect(JSON.parse(localStorage.getItem('rustdojo:completed')!)).toContain('m2-03');
  });

  it('clearProgress 清空', () => {
    markCompleted('m1-01');
    clearProgress();
    expect(getCompleted()).toEqual([]);
  });

  it('subscribe 在变化时被通知', () => {
    const cb = vi.fn();
    const unsub = subscribe(cb);
    markCompleted('m1-01');
    expect(cb).toHaveBeenCalled();
    unsub();
  });

  it('setAll 整体替换并去重', () => {
    markCompleted('m1-01');
    setAll(['m2-01', 'm2-01', 'm3-01']);
    expect(getCompleted().sort()).toEqual(['m2-01', 'm3-01']);
  });

  it('setAll 触发订阅通知', () => {
    const cb = vi.fn();
    const unsub = subscribe(cb);
    setAll(['m4-01']);
    expect(cb).toHaveBeenCalled();
    unsub();
  });

  it('unmarkCompleted 移除单条且不影响其他条目', () => {
    markCompleted('p1-01');
    markCompleted('p1-02');
    unmarkCompleted('p1-01');
    expect(getCompleted()).toEqual(['p1-02']);
    expect(isCompleted('p1-01')).toBe(false);
    expect(JSON.parse(localStorage.getItem('rustdojo:completed')!)).toEqual(['p1-02']);
  });

  it('unmarkCompleted 对不存在的 id 是空操作（不通知订阅者）', () => {
    markCompleted('p1-01');
    const cb = vi.fn();
    const unsub = subscribe(cb);
    unmarkCompleted('p1-99');
    expect(cb).not.toHaveBeenCalled();
    expect(getCompleted()).toEqual(['p1-01']);
    unsub();
  });

  it('unmarkCompleted 触发订阅通知', () => {
    markCompleted('p1-01');
    const cb = vi.fn();
    const unsub = subscribe(cb);
    unmarkCompleted('p1-01');
    expect(cb).toHaveBeenCalled();
    unsub();
  });

  it('未登录时不打云端接口', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setAuthed(false);
    markCompleted('p1-01');
    unmarkCompleted('p1-01');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('登录态下 unmarkCompleted 后台 DELETE /api/progress', () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(new Response('{}')),
    );
    vi.stubGlobal('fetch', fetchMock);
    setAuthed(true);
    markCompleted('p1-01');
    unmarkCompleted('p1-01');
    const del = fetchMock.mock.calls.find((c) => c[1].method === 'DELETE');
    expect(del).toBeDefined();
    expect(del![0]).toBe('/api/progress');
    expect(JSON.parse(del![1].body as string)).toEqual({ exerciseId: 'p1-01' });
    setAuthed(false);
    vi.unstubAllGlobals();
  });
});
