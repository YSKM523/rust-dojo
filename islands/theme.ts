/**
 * theme island — 深浅色切换
 *
 * 语义事实源：components/ThemeToggle.tsx（逐行移植，行为一致）
 *   - 当前主题读 <html data-theme>，缺省按 'dark'
 *   - 切换：light -> dark，其余 -> light
 *   - 写 localStorage['rustdojo:theme']，隐私模式下静默失败
 *   - 图标（月亮/太阳）由 CSS 的 .theme-icon-moon / .theme-icon-sun 互换，
 *     island 不碰图标 DOM
 *
 * 挂载协议（模板按此写 DOM）：
 *
 *   <button
 *     data-island="theme-toggle"
 *     aria-label="切换深浅色"
 *     class="flex h-8 w-8 items-center justify-center rounded-md border border-line text-fg2 hover:text-fg">
 *     <svg class="theme-icon-moon" ...>…</svg>
 *     <svg class="theme-icon-sun" ...>…</svg>
 *   </button>
 *
 *   - 选择器：[data-island="theme-toggle"]，页面内可有多个（都会绑上）
 *   - 首屏防闪由 <head> 内联脚本负责（照 app/layout.tsx 的 themeScript），
 *     不是本 island 的职责
 */

const STORAGE_KEY = 'rustdojo:theme';

type Theme = 'light' | 'dark';

/** 切换 <html data-theme> 并持久化。导出供其它 island / 测试复用。 */
export function toggleTheme(): Theme {
  const theme = (document.documentElement.getAttribute('data-theme') as Theme) || 'dark';
  const next: Theme = theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* 隐私模式忽略 */
  }
  return next;
}

export function mountTheme(root: ParentNode = document): void {
  const buttons = root.querySelectorAll<HTMLElement>('[data-island="theme-toggle"]');
  for (const btn of Array.from(buttons)) {
    if (btn.dataset.islandReady === '1') continue;
    btn.dataset.islandReady = '1';
    btn.addEventListener('click', () => {
      toggleTheme();
    });
  }
}

mountTheme();
