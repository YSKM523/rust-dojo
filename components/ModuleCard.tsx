import Link from 'next/link';
import type { ModuleDef, TierKey } from '@/lib/rust/types';
import { ModuleProgressBadge } from './ModuleProgressBadge';

// tierKey → 完整静态类名（Tailwind 不会生成 `bg-${x}-600` 这种动态拼接的类）
const TIER_BADGE: Record<TierKey, string> = {
  beginner: 'bg-emerald-600 text-white',
  intermediate: 'bg-amber-600 text-white',
  advanced: 'bg-orange-600 text-white',
  senior: 'bg-rose-600 text-white',
  sprint: 'bg-sky-600 text-white',
};

export function ModuleCard({
  module,
  exerciseIds,
}: {
  module: ModuleDef;
  exerciseIds: string[];
}) {
  return (
    <Link
      href={`/learn/${module.id}`}
      className="group block min-w-0 border border-line bg-panel p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand hover:bg-panel2"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-3xl font-black leading-none text-fg3 group-hover:text-brand">
          {String(module.order).padStart(2, '0')}
        </span>
        <span className={`px-2 py-0.5 text-xs font-bold ${TIER_BADGE[module.tierKey]}`}>
          {module.tierLabel}
        </span>
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-fg3">
        Module {module.order}
      </p>
      <h3 className="mt-2 text-xl font-black text-fg group-hover:text-brand">{module.title}</h3>
      <p className="mt-3 min-h-[72px] text-sm leading-6 text-fg2">{module.summary}</p>
      <div className="mt-5">
        <ModuleProgressBadge exerciseIds={exerciseIds} />
      </div>
    </Link>
  );
}
