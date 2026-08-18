/**
 * progress-badge island — 模块通关进度条
 *
 * 语义事实源：components/ModuleProgressBadge.tsx（逐行移植）
 *   - n     = exerciseIds 里已完成的条数
 *   - total = exerciseIds.length
 *   - pct   = total ? Math.round((n / total) * 100) : 0   （进度条宽度）
 *   - 文案  = `${n} / ${total} 通关`
 *   - n === total && total > 0 时才显示 Check 图标
 *   - 数据源 lib/progress/store.ts 原文件（零分叉复用，不改动它）
 *
 * SSR 首屏等价于 React 的 getServerSnapshot（空数组）：0 / total、宽度 0%、
 * Check 隐藏；本 island 挂载后立刻用 localStorage 真值覆写，并订阅后续变更。
 *
 * 挂载协议（模板按此写 DOM，Tailwind 类名照搬 ModuleProgressBadge.tsx）：
 *
 *   <div data-module-progress data-module-id="m1" data-exercise-ids="m1-01,m1-02,m1-03">
 *     <div class="h-1.5 w-full overflow-hidden rounded-full bg-panel2">
 *       <div class="h-full rounded-full bg-brand" style="width: 0%" data-progress-bar></div>
 *     </div>
 *     <p class="mt-1.5 flex items-center gap-1 text-xs text-fg3">
 *       <span data-progress-text>0 / 3 通关</span>
 *       <svg data-progress-check hidden class="text-ok" width="12" height="12" …>…</svg>
 *     </p>
 *   </div>
 *
 *   - 根选择器：[data-module-progress]
 *   - data-module-id      模块 id（标识用，便于调试/定位）
 *   - data-exercise-ids   逗号分隔的练习 id 列表（计数的唯一输入，顺序无关）
 *   - [data-progress-bar]   进度条内层，island 只改 style.width
 *   - [data-progress-text]  文案节点，island 只改 textContent
 *   - [data-progress-check] Check 图标（lucide Check，size=12，class="text-ok"），
 *                           island 只切 hidden 属性；模板必须初始带 hidden
 */

import { subscribe, getSnapshot } from '@/lib/progress/store';

function parseIds(el: HTMLElement): string[] {
  return (el.getAttribute('data-exercise-ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function paint(root: ParentNode, done: Set<string>): void {
  const nodes = root.querySelectorAll<HTMLElement>('[data-module-progress]');
  for (const el of Array.from(nodes)) {
    const ids = parseIds(el);
    const total = ids.length;
    const n = ids.filter((id) => done.has(id)).length;
    const pct = total ? Math.round((n / total) * 100) : 0;

    const bar = el.querySelector<HTMLElement>('[data-progress-bar]');
    if (bar) bar.style.width = `${pct}%`;

    const text = el.querySelector<HTMLElement>('[data-progress-text]');
    if (text) text.textContent = `${n} / ${total} 通关`;

    // 注意：Check 图标是 <svg>（SVGElement 没有 hidden IDL 属性），
    // 必须走 setAttribute/removeAttribute，不能写 .hidden = x。
    const check = el.querySelector('[data-progress-check]');
    if (check) {
      if (n === total && total > 0) check.removeAttribute('hidden');
      else check.setAttribute('hidden', '');
    }
  }
}

export function mountProgressBadges(root: ParentNode = document): () => void {
  const render = () => paint(root, new Set(getSnapshot()));
  render();
  return subscribe(render);
}

mountProgressBadges();
