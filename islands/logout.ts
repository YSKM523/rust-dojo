/**
 * logout island — 顶栏退出登录
 *
 * 语义事实源：components/Topbar.tsx 的 logout()：POST /api/auth/logout，
 * 请求失败也继续跳转首页。
 *
 * 挂载协议：
 *   <button data-island="logout" class="rounded border border-line bg-panel2 px-2.5 py-1 text-fg2 transition-colors hover:text-fg">退出</button>
 */

export type LogoutRequest = (input: string, init: RequestInit) => Promise<unknown>;
export type LogoutNavigate = (href: string) => void;

export async function performLogout(request: LogoutRequest, navigate: LogoutNavigate): Promise<void> {
  await request('/api/auth/logout', { method: 'POST' }).catch(() => {});
  navigate('/');
}

export function mountLogout(
  root: ParentNode = document,
  request: LogoutRequest = fetch,
  navigate: LogoutNavigate = (href) => window.location.assign(href),
): void {
  const buttons = root.querySelectorAll<HTMLElement>('[data-island="logout"]');
  for (const button of Array.from(buttons)) {
    if (button.dataset.islandReady === '1') continue;
    button.dataset.islandReady = '1';
    button.addEventListener('click', () => {
      void performLogout(request, navigate);
    });
  }
}

mountLogout();
