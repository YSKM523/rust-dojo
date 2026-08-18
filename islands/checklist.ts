/**
 * checklist island — 项目验收清单
 *
 * 语义事实源：components/ProjectChecklist.tsx（逐节点移植）
 *   - 勾选调用 lib/progress/store.ts 原文件的 markCompleted / unmarkCompleted
 *   - subscribe 驱动 checkbox、label、计数、进度条宽度与 aria-valuenow 同步
 *   - pct = total ? Math.round((done / total) * 100) : 0
 *   - 全部完成且 total > 0 时显示 Check 图标
 *   - 复制成功态保持 1600ms；剪贴板不可用时静默放弃
 *   - 提示按钮同步 aria-expanded、文案与提示正文可见性
 *
 * 挂载协议（模板 DOM 与 ProjectChecklist.tsx 对齐）：
 *
 *   <section data-checklist>
 *     <span data-checklist-progress-text>0 / N 已验收</span>
 *     <svg data-checklist-complete hidden>…</svg>
 *     <div role="progressbar" aria-valuenow="0" … data-checklist-progress>
 *       <div style="width: 0%" data-checklist-progress-bar></div>
 *     </div>
 *     <input type="checkbox" data-id="p1-01" data-checklist-input>
 *     <label data-checklist-label>…</label>
 *     <button data-checklist-copy data-copy-text="cargo test">…</button>
 *     <button aria-expanded="false" data-checklist-hint-toggle>…</button>
 *     <p data-checklist-hint hidden>…</p>
 *   </section>
 *
 * 每个 checkbox 的 data-id 是 progress store id。copy 按钮内含
 * [data-copy-idle]/[data-copy-success]；hint 按钮内含
 * [data-hint-collapsed]/[data-hint-expanded]，island 只切 hidden 属性。
 */

import {
  getSnapshot,
  markCompleted,
  subscribe,
  unmarkCompleted,
} from '@/lib/progress/store';

function setHidden(el: Element | null, hidden: boolean): void {
  if (!el) return;
  if (hidden) el.setAttribute('hidden', '');
  else el.removeAttribute('hidden');
}

function checklistInputs(root: Element): HTMLInputElement[] {
  return Array.from(root.querySelectorAll<HTMLInputElement>('[data-checklist-input]'));
}

function paint(root: ParentNode, completed: Set<string>): void {
  const checklists = root.querySelectorAll<HTMLElement>('[data-checklist]');
  for (const checklist of Array.from(checklists)) {
    const inputs = checklistInputs(checklist);
    const total = inputs.length;
    let done = 0;

    for (const input of inputs) {
      const checked = completed.has(input.dataset.id ?? '');
      input.checked = checked;
      if (checked) done += 1;

      const label = input.parentElement?.querySelector<HTMLElement>('[data-checklist-label]');
      if (label) {
        label.classList.toggle('text-fg', !checked);
        label.classList.toggle('text-fg3', checked);
        label.classList.toggle('line-through', checked);
      }
    }

    const pct = total ? Math.round((done / total) * 100) : 0;
    const text = checklist.querySelector<HTMLElement>('[data-checklist-progress-text]');
    if (text) text.textContent = `${done} / ${total} 已验收`;

    const progress = checklist.querySelector<HTMLElement>('[data-checklist-progress]');
    progress?.setAttribute('aria-valuenow', String(pct));

    const bar = checklist.querySelector<HTMLElement>('[data-checklist-progress-bar]');
    if (bar) bar.style.width = `${pct}%`;

    setHidden(
      checklist.querySelector('[data-checklist-complete]'),
      !(total > 0 && done === total),
    );
  }
}

export function mountChecklist(root: ParentNode = document): () => void {
  const cleanups: Array<() => void> = [];
  const timers = new Map<HTMLButtonElement, number>();
  const render = () => paint(root, new Set(getSnapshot()));

  for (const checklist of Array.from(root.querySelectorAll<HTMLElement>('[data-checklist]'))) {
    if (checklist.dataset.checklistReady === '1') continue;
    checklist.dataset.checklistReady = '1';

    for (const input of checklistInputs(checklist)) {
      const onChange = () => {
        const id = input.dataset.id ?? '';
        if (!id) return;
        if (input.checked) markCompleted(id);
        else unmarkCompleted(id);
      };
      input.addEventListener('change', onChange);
      cleanups.push(() => input.removeEventListener('change', onChange));
    }

    for (const button of Array.from(
      checklist.querySelectorAll<HTMLButtonElement>('[data-checklist-copy]'),
    )) {
      const onCopy = async () => {
        try {
          await navigator.clipboard.writeText(button.dataset.copyText ?? '');
        } catch {
          return;
        }
        const previousTimer = timers.get(button);
        if (previousTimer !== undefined) window.clearTimeout(previousTimer);
        setHidden(button.querySelector('[data-copy-idle]'), true);
        setHidden(button.querySelector('[data-copy-success]'), false);
        const timer = window.setTimeout(() => {
          timers.delete(button);
          setHidden(button.querySelector('[data-copy-idle]'), false);
          setHidden(button.querySelector('[data-copy-success]'), true);
        }, 1600);
        timers.set(button, timer);
      };
      button.addEventListener('click', onCopy);
      cleanups.push(() => button.removeEventListener('click', onCopy));
    }

    for (const button of Array.from(
      checklist.querySelectorAll<HTMLButtonElement>('[data-checklist-hint-toggle]'),
    )) {
      const onToggle = () => {
        const expanded = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(expanded));
        setHidden(button.querySelector('[data-hint-collapsed]'), expanded);
        setHidden(button.querySelector('[data-hint-expanded]'), !expanded);
        setHidden(button.parentElement?.querySelector('[data-checklist-hint]') ?? null, !expanded);
      };
      button.addEventListener('click', onToggle);
      cleanups.push(() => button.removeEventListener('click', onToggle));
    }

    cleanups.push(() => {
      delete checklist.dataset.checklistReady;
    });
  }

  render();
  const unsubscribe = subscribe(render);
  return () => {
    unsubscribe();
    for (const timer of timers.values()) window.clearTimeout(timer);
    for (const cleanup of cleanups) cleanup();
  };
}

mountChecklist();
