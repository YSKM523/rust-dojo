'use client';
import Link from 'next/link';
import { useState } from 'react';
import { EditorialPanel } from '@/components/EditorialPanel';
import { allModules } from '@/content/modules';
import { exercisesByModule, allExercises } from '@/content/exercises';
import { useCompletedIds } from '@/lib/progress/useProgress';
import { clearProgress } from '@/lib/progress/store';
import { useSession } from '@/lib/auth/useSession';

export default function MePage() {
  const done = new Set(useCompletedIds());
  const { user, loading } = useSession();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const total = allExercises.length;
  const solved = allExercises.filter((e) => done.has(e.id)).length;

  return (
    <main className="w-full overflow-hidden bg-bg">
      <EditorialPanel className="bg-bg2" innerClassName="items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <header className="border-t border-line pt-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-brand">
              PROGRESS LOG
            </p>
            <h1 className="mt-6 text-5xl font-black leading-none text-fg sm:text-7xl">
              我的足迹
            </h1>
            <p className="mt-8 text-fg2">
              已通关{' '}
              <span className="align-baseline text-7xl font-black leading-none text-brand sm:text-8xl">
                {solved}
              </span>{' '}
              / {total} 题
            </p>
            {!loading &&
              (user ? (
                <p className="mt-4 text-sm text-fg3">已登录 {user.email} · 进度已云端同步</p>
              ) : (
                <p className="mt-4 text-sm text-fg3">
                  <Link href="/login" className="text-link">
                    登录
                  </Link>{' '}
                  以跨设备保存进度
                </p>
              ))}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/learn" className="text-sm font-bold text-link">
                去路线图
              </Link>
              {confirmingClear ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      clearProgress();
                      setConfirmingClear(false);
                    }}
                    className="border border-bad px-3 py-1 text-sm font-medium text-bad hover:bg-bad-soft"
                  >
                    确认清空
                  </button>
                  <button
                    onClick={() => setConfirmingClear(false)}
                    className="border border-line px-3 py-1 text-sm text-fg2 hover:text-fg"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingClear(true)}
                  className="border border-line px-3 py-1 text-sm text-fg2 hover:text-fg"
                >
                  清空进度
                </button>
              )}
            </div>
          </header>

          <ul className="grid gap-px bg-line shadow-card">
            {allModules.map((m) => {
              const ids = exercisesByModule(m.id).map((e) => e.id);
              const n = ids.filter((id) => done.has(id)).length;
              const pct = ids.length ? Math.round((n / ids.length) * 100) : 0;
              return (
                <li key={m.id} className="bg-panel p-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <Link href={`/learn/${m.id}`} className="font-semibold text-fg hover:text-brand">
                      {String(m.order).padStart(2, '0')} / {m.title}
                    </Link>
                    <span className="shrink-0 text-fg3">
                      {n} / {ids.length}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden bg-panel2">
                    <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </EditorialPanel>
    </main>
  );
}
