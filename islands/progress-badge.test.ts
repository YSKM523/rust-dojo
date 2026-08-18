// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearProgress, markCompleted } from '@/lib/progress/store';
import { mountProgressBadges } from './progress-badge';

beforeEach(() => {
  localStorage.clear();
  clearProgress();
  document.body.innerHTML = '';
});

describe('progress-badge island', () => {
  it('完成练习后把难度替换为通关图标', () => {
    document.body.innerHTML = `
      <li data-exercise-id="m1-01">
        <span data-exercise-difficulty>难度 1</span>
        <span data-exercise-check hidden>check</span>
      </li>`;
    const unmount = mountProgressBadges(document);

    markCompleted('m1-01');

    expect(document.querySelector('[data-exercise-difficulty]')).toHaveAttribute('hidden');
    expect(document.querySelector('[data-exercise-check]')).not.toHaveAttribute('hidden');
    unmount();
  });

  it('只统计当前项目的验收项', () => {
    document.body.innerHTML = `
      <div data-project-progress data-item-ids="p1-01,p1-02">
        <div data-project-progress-bar style="width: 0%"></div>
        <span data-project-progress-text>0 / 2 已验收</span>
        <span data-project-progress-check hidden>check</span>
      </div>`;
    const unmount = mountProgressBadges(document);

    markCompleted('p1-01');
    markCompleted('m1-01');

    expect(document.querySelector('[data-project-progress-bar]')).toHaveStyle({ width: '50%' });
    expect(document.querySelector('[data-project-progress-text]')).toHaveTextContent('1 / 2 已验收');
    expect(document.querySelector('[data-project-progress-check]')).toHaveAttribute('hidden');
    unmount();
  });
});
