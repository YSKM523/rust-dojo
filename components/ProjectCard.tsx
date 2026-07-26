'use client';
import Link from 'next/link';
import { Check, Hammer } from 'lucide-react';
import type { ProjectDef } from '@/lib/rust/types';
import { useCompletedIds } from '@/lib/progress/useProgress';

// 路线图上的实战项目卡：与 ModuleCard 同处一个网格，但用纯色 accent 块把它明显区分出来。
export function ProjectCard({ project }: { project: ProjectDef }) {
  const completed = new Set(useCompletedIds());
  const total = project.items.length;
  const done = project.items.filter((i) => completed.has(i.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  return (
    <Link
      href={`/project/${project.id}`}
      className="group block min-w-0 border border-brand bg-panel p-5 shadow-card transition hover:-translate-y-0.5 hover:bg-panel2"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-9 w-9 items-center justify-center bg-brand text-white">
          <Hammer size={18} />
        </span>
        <span className="bg-brand px-2 py-0.5 text-xs font-bold text-white">实战项目</span>
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-brand">
        Project {project.id.toUpperCase()} · 本地 cargo
      </p>
      <h3 className="mt-2 text-xl font-black text-fg group-hover:text-brand">{project.title}</h3>
      <p className="mt-3 min-h-[72px] text-sm leading-6 text-fg2">{project.summary}</p>
      <div className="mt-5">
        <div className="h-1.5 w-full overflow-hidden bg-panel2">
          <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-fg3">
          {done} / {total} 已验收
          {allDone && <Check size={12} className="text-ok" />}
        </p>
      </div>
    </Link>
  );
}
