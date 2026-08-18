// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProgress, getCompleted, markCompleted } from '@/lib/progress/store';
import { mountMe } from './me';

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
}

function renderFixture(): void {
  document.body.innerHTML = `
    <main data-island="me" data-exercise-ids="m1-01,m1-02,m2-01">
      <header data-me-header>
        <p>已通关 <span data-me-solved>0</span> / 3 题</p>
        <div data-me-actions>
          <a href="/learn" class="text-sm font-bold text-link">去路线图</a>
          <button class="border border-line px-3 py-1 text-sm text-fg2 hover:text-fg" data-me-clear-start>清空进度</button>
        </div>
      </header>
      <ul>
        <li data-me-module data-module-id="m1" data-exercise-ids="m1-01,m1-02">
          <span data-me-module-count>0 / 2</span>
          <div class="h-full bg-brand" style="width: 0%" data-me-module-bar></div>
        </li>
        <li data-me-module data-module-id="m2" data-exercise-ids="m2-01">
          <span data-me-module-count>0 / 1</span>
          <div class="h-full bg-brand" style="width: 0%" data-me-module-bar></div>
        </li>
      </ul>
    </main>`;
}

beforeEach(() => {
  localStorage.clear();
  clearProgress();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('me island', () => {
  it('hydrates and subscribes to exercise-only totals with rounded module percentages', () => {
    markCompleted('m1-01');
    markCompleted('p1-01');
    markCompleted('unknown');
    renderFixture();
    const unmount = mountMe(document, vi.fn().mockResolvedValue(response({ user: null })));

    expect(document.querySelector('[data-me-solved]')).toHaveTextContent('1');
    expect(document.querySelector('[data-module-id="m1"] [data-me-module-count]')).toHaveTextContent('1 / 2');
    expect(document.querySelector('[data-module-id="m1"] [data-me-module-bar]')).toHaveStyle({ width: '50%' });
    expect(document.querySelector('[data-module-id="m2"] [data-me-module-bar]')).toHaveStyle({ width: '0%' });

    markCompleted('m2-01');
    expect(document.querySelector('[data-me-solved]')).toHaveTextContent('2');
    expect(document.querySelector('[data-module-id="m2"] [data-me-module-bar]')).toHaveStyle({ width: '100%' });
    unmount();
  });

  it('renders the authenticated session message from api auth me', async () => {
    renderFixture();
    const request = vi.fn().mockResolvedValue(response({ user: { email: 'learner@example.com' } }));
    const unmount = mountMe(document, request);

    expect(document.querySelector('[data-me-session-status]')).not.toBeInTheDocument();
    await vi.waitFor(() => expect(document.querySelector('[data-me-session-status]')).toHaveTextContent('已登录 learner@example.com · 进度已云端同步'));
    expect(request).toHaveBeenCalledWith('/api/auth/me');
    expect(document.querySelector('[data-me-session-status] a')).not.toBeInTheDocument();
    unmount();
  });

  it('renders the anonymous login prompt when api auth me is anonymous or fails', async () => {
    renderFixture();
    const request = vi.fn().mockRejectedValue(new Error('offline'));
    const unmount = mountMe(document, request);

    await vi.waitFor(() => expect(document.querySelector('[data-me-session-status]')).toHaveTextContent('登录 以跨设备保存进度'));
    expect(document.querySelector('[data-me-session-status] a')).toHaveAttribute('href', '/login');
    expect(document.querySelector('[data-me-session-status] a')).toHaveClass('text-link');
    unmount();
  });

  it('requires confirmation to clear progress and supports cancellation', () => {
    markCompleted('m1-01');
    renderFixture();
    const unmount = mountMe(document, vi.fn().mockResolvedValue(response({ user: null })));

    fireEvent.click(document.querySelector('[data-me-clear-start]')!);
    expect(document.querySelector('[data-me-clear-confirm]')).toHaveTextContent('确认清空');
    expect(document.querySelector('[data-me-clear-cancel]')).toHaveTextContent('取消');
    expect(getCompleted()).toContain('m1-01');

    fireEvent.click(document.querySelector('[data-me-clear-cancel]')!);
    expect(document.querySelector('[data-me-clear-start]')).toHaveTextContent('清空进度');
    expect(getCompleted()).toContain('m1-01');

    fireEvent.click(document.querySelector('[data-me-clear-start]')!);
    fireEvent.click(document.querySelector('[data-me-clear-confirm]')!);
    expect(getCompleted()).toEqual([]);
    expect(document.querySelector('[data-me-solved]')).toHaveTextContent('0');
    expect(document.querySelector('[data-me-clear-start]')).toHaveTextContent('清空进度');
    unmount();
  });
});
