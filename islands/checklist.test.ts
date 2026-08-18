// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProgress, getCompleted, markCompleted } from '@/lib/progress/store';
import { mountChecklist } from './checklist';

function renderFixture(): void {
  document.body.innerHTML = `
    <section data-checklist>
      <p><span data-checklist-progress-text>0 / 2 已验收</span><svg data-checklist-complete hidden></svg></p>
      <div role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="验收进度" data-checklist-progress>
        <div style="width: 0%" data-checklist-progress-bar></div>
      </div>
      <ul>
        <li>
          <input id="check-px-01" type="checkbox" data-id="px-01" data-checklist-input>
          <label for="check-px-01" data-checklist-label><span>px-01</span>第一条</label>
          <button type="button" aria-label="复制命令：cargo test" data-checklist-copy data-copy-text="cargo test">
            <span data-copy-idle>复制</span><span data-copy-success hidden>已复制</span>
          </button>
          <button type="button" aria-expanded="false" data-checklist-hint-toggle>
            <span data-hint-collapsed>看提示</span><span data-hint-expanded hidden>收起提示</span>
          </button>
          <p data-checklist-hint hidden>这是提示</p>
        </li>
        <li>
          <input id="check-px-02" type="checkbox" data-id="px-02" data-checklist-input>
          <label for="check-px-02" data-checklist-label><span>px-02</span>第二条</label>
        </li>
      </ul>
    </section>`;
}

beforeEach(() => {
  localStorage.clear();
  clearProgress();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('checklist island', () => {
  it('hydrates store state then keeps checkbox, label, percentage, and complete icon in sync', () => {
    markCompleted('px-01');
    renderFixture();
    const unmount = mountChecklist(document);
    const inputs = document.querySelectorAll<HTMLInputElement>('[data-checklist-input]');
    const label = document.querySelector('[data-checklist-label]');

    expect(inputs[0]).toBeChecked();
    expect(label).toHaveClass('text-fg3', 'line-through');
    expect(document.querySelector('[data-checklist-progress-text]')).toHaveTextContent('1 / 2 已验收');
    expect(document.querySelector('[data-checklist-progress]')).toHaveAttribute('aria-valuenow', '50');
    expect(document.querySelector('[data-checklist-progress-bar]')).toHaveStyle({ width: '50%' });

    fireEvent.click(inputs[1]);
    expect(getCompleted()).toEqual(expect.arrayContaining(['px-01', 'px-02']));
    expect(document.querySelector('[data-checklist-progress-text]')).toHaveTextContent('2 / 2 已验收');
    expect(document.querySelector('[data-checklist-complete]')).not.toHaveAttribute('hidden');

    fireEvent.click(inputs[0]);
    expect(getCompleted()).not.toContain('px-01');
    expect(label).toHaveClass('text-fg');
    expect(label).not.toHaveClass('text-fg3', 'line-through');
    unmount();
  });

  it('copies commands and shows the same temporary success state as React', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderFixture();
    const unmount = mountChecklist(document);

    fireEvent.click(document.querySelector('[data-checklist-copy]')!);

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('cargo test'));
    expect(document.querySelector('[data-copy-idle]')).toHaveAttribute('hidden');
    expect(document.querySelector('[data-copy-success]')).not.toHaveAttribute('hidden');
    unmount();
  });

  it('restarts the copy success timer after repeated clicks', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderFixture();
    const unmount = mountChecklist(document);
    const button = document.querySelector('[data-checklist-copy]')!;

    fireEvent.click(button);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(800);
    fireEvent.click(button);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(801);

    expect(document.querySelector('[data-copy-success]')).not.toHaveAttribute('hidden');
    await vi.advanceTimersByTimeAsync(799);
    expect(document.querySelector('[data-copy-success]')).toHaveAttribute('hidden');
    unmount();
  });

  it('toggles hint DOM and aria-expanded', () => {
    renderFixture();
    const unmount = mountChecklist(document);
    const toggle = document.querySelector('[data-checklist-hint-toggle]')!;
    const hint = document.querySelector('[data-checklist-hint]');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(hint).not.toHaveAttribute('hidden');
    expect(document.querySelector('[data-hint-collapsed]')).toHaveAttribute('hidden');
    expect(document.querySelector('[data-hint-expanded]')).not.toHaveAttribute('hidden');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(hint).toHaveAttribute('hidden');
    unmount();
  });
});
