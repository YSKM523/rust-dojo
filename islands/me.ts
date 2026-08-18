/**
 * me island — 我的足迹进度、客户端登录态与清空确认
 *
 * 语义事实源：app/me/page.tsx。
 *   - 复用 lib/progress/store.ts 的 getSnapshot / subscribe / clearProgress
 *   - solved 只统计模板 data-exercise-ids 声明的练习，不统计项目或未知 id
 *   - 各模块 n / total 与 Math.round 百分比同步更新
 *   - 页面登录提示保持 useSession 行为：挂载后 GET /api/auth/me，失败视为未登录
 *   - 清空进度保留 React 的“清空进度 → 确认清空/取消”两态
 *   - Topbar 登出继续由既有 islands/logout.ts 独立负责，避免重复绑定
 *
 * 挂载协议：
 *   <main data-island="me" data-exercise-ids="全部练习 id（逗号分隔）">
 *     <header data-me-header>
 *       …<span data-me-solved>0</span>…
 *       <div data-me-actions>…<button data-me-clear-start>清空进度</button></div>
 *     </header>
 *     <li data-me-module data-module-id="m1" data-exercise-ids="模块练习 id">
 *       <span data-me-module-count>0 / N</span>
 *       <div style="width: 0%" data-me-module-bar></div>
 *     </li>
 *   </main>
 *
 * SSR 对齐 React server snapshot：初始为 0 / total、0%，且 loading=true 时不输出
 * 登录提示。island 请求 settle 后在 actions 前动态插入 [data-me-session-status]。
 */

import { clearProgress, getSnapshot, subscribe } from '@/lib/progress/store';

export type MeRequest = (input: string) => Promise<Response>;

interface SessionUser {
  email: string;
}

function parseIds(element: Element, attribute = 'data-exercise-ids'): string[] {
  return (element.getAttribute(attribute) ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function paint(root: HTMLElement): void {
  const completed = new Set(getSnapshot());
  const exerciseIds = parseIds(root);
  const solved = exerciseIds.filter((id) => completed.has(id)).length;
  const solvedNode = root.querySelector<HTMLElement>('[data-me-solved]');
  if (solvedNode) solvedNode.textContent = String(solved);

  for (const moduleRoot of Array.from(
    root.querySelectorAll<HTMLElement>('[data-me-module]'),
  )) {
    const ids = parseIds(moduleRoot);
    const total = ids.length;
    const done = ids.filter((id) => completed.has(id)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const count = moduleRoot.querySelector<HTMLElement>('[data-me-module-count]');
    const bar = moduleRoot.querySelector<HTMLElement>('[data-me-module-bar]');
    if (count) count.textContent = `${done} / ${total}`;
    if (bar) bar.style.width = `${pct}%`;
  }
}

function clearSessionStatus(root: HTMLElement): void {
  root.querySelector('[data-me-session-status]')?.remove();
}

function renderSessionStatus(root: HTMLElement, user: SessionUser | null): void {
  clearSessionStatus(root);
  const header = root.querySelector<HTMLElement>('[data-me-header]');
  const actions = root.querySelector<HTMLElement>('[data-me-actions]');
  if (!header || !actions) return;

  const status = document.createElement('p');
  status.className = 'mt-4 text-sm text-fg3';
  status.dataset.meSessionStatus = '';
  if (user) {
    status.textContent = `已登录 ${user.email} · 进度已云端同步`;
  } else {
    const link = document.createElement('a');
    link.href = '/login';
    link.className = 'text-link';
    link.textContent = '登录';
    status.append(link, document.createTextNode(' 以跨设备保存进度'));
  }
  header.insertBefore(status, actions);
}

function createClearButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'border border-line px-3 py-1 text-sm text-fg2 hover:text-fg';
  button.dataset.meClearStart = '';
  button.textContent = '清空进度';
  return button;
}

function renderClearButton(actions: HTMLElement): void {
  actions.querySelector('[data-me-clear-start]')?.remove();
  actions.querySelector('[data-me-clear-confirmation]')?.remove();
  actions.append(createClearButton());
}

function renderClearConfirmation(actions: HTMLElement): void {
  actions.querySelector('[data-me-clear-start]')?.remove();
  actions.querySelector('[data-me-clear-confirmation]')?.remove();

  const confirmation = document.createElement('div');
  confirmation.className = 'flex items-center gap-2';
  confirmation.dataset.meClearConfirmation = '';

  const confirm = document.createElement('button');
  confirm.className =
    'border border-bad px-3 py-1 text-sm font-medium text-bad hover:bg-bad-soft';
  confirm.dataset.meClearConfirm = '';
  confirm.textContent = '确认清空';

  const cancel = document.createElement('button');
  cancel.className = 'border border-line px-3 py-1 text-sm text-fg2 hover:text-fg';
  cancel.dataset.meClearCancel = '';
  cancel.textContent = '取消';

  confirmation.append(confirm, cancel);
  actions.append(confirmation);
}

async function loadSession(
  root: HTMLElement,
  request: MeRequest,
  alive: () => boolean,
): Promise<void> {
  let user: SessionUser | null = null;
  try {
    const response = await request('/api/auth/me');
    const data = (await response.json()) as { user?: SessionUser | null };
    user = data.user ?? null;
  } catch {
    user = null;
  }
  if (alive()) renderSessionStatus(root, user);
}

export function mountMe(
  root: ParentNode = document,
  request: MeRequest = fetch,
): () => void {
  const cleanups: Array<() => void> = [];
  for (const island of Array.from(
    root.querySelectorAll<HTMLElement>('[data-island="me"]'),
  )) {
    if (island.dataset.meReady === '1') continue;
    island.dataset.meReady = '1';
    let alive = true;
    const actions = island.querySelector<HTMLElement>('[data-me-actions]');
    const render = () => paint(island);

    const onClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || !actions) return;
      if (target.closest('[data-me-clear-start]')) {
        renderClearConfirmation(actions);
      } else if (target.closest('[data-me-clear-cancel]')) {
        renderClearButton(actions);
      } else if (target.closest('[data-me-clear-confirm]')) {
        clearProgress();
        renderClearButton(actions);
      }
    };

    render();
    const unsubscribe = subscribe(render);
    actions?.addEventListener('click', onClick);
    void loadSession(island, request, () => alive);
    cleanups.push(() => {
      alive = false;
      unsubscribe();
      actions?.removeEventListener('click', onClick);
      delete island.dataset.meReady;
    });
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

mountMe();
