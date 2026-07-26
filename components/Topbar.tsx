'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TerminalSquare } from 'lucide-react';
import { useSession } from '@/lib/auth/useSession';
import { ThemeToggle } from './ThemeToggle';

export function Topbar() {
  const pathname = usePathname();
  const { user, loading } = useSession();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/');
  }

  const link = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`flex h-full shrink-0 items-center text-[13px] font-medium tracking-wide transition-colors ${
        active
          ? 'font-semibold text-fg [box-shadow:inset_0_-2px_0_var(--brand)]'
          : 'text-fg2 hover:text-fg'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 flex h-[58px] items-center gap-4 border-b border-line/80 bg-panel/90 px-4 backdrop-blur-xl">
      <Link href="/" className="flex shrink-0 items-center gap-2 font-extrabold tracking-tight text-fg">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-[#15181d] text-brand shadow-card">
          <TerminalSquare size={13} />
        </span>
        Rust 道场
      </Link>
      <nav className="flex h-full min-w-0 items-center gap-3 overflow-x-auto">
        {link('/learn', '学习路线图', pathname.startsWith('/learn') || pathname.startsWith('/exercise'))}
        {link('/resources', '资料库', pathname.startsWith('/resources'))}
        {link('/me', '我的足迹', pathname === '/me')}
      </nav>
      <div className="flex-1" />
      <ThemeToggle />
      {!loading &&
        (user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-fg2">{user.email}</span>
            <button
              onClick={logout}
              className="rounded border border-line bg-panel2 px-2.5 py-1 text-fg2 transition-colors hover:text-fg"
            >
              退出
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="shrink-0 rounded bg-brand px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            登录
          </Link>
        ))}
    </header>
  );
}
