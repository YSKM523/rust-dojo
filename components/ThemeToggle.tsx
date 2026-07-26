'use client';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  function toggle() {
    const theme =
      (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'dark';
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('rustdojo:theme', next);
    } catch {
      /* 隐私模式忽略 */
    }
  }
  return (
    <button
      onClick={toggle}
      aria-label="切换深浅色"
      className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-fg2 hover:text-fg"
    >
      <Moon className="theme-icon-moon" size={16} />
      <Sun className="theme-icon-sun" size={16} />
    </button>
  );
}
