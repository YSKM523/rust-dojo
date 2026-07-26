import Link from 'next/link';
import { BookOpen, FileText, Library, Play, TerminalSquare } from 'lucide-react';
import { EditorialPanel } from '@/components/EditorialPanel';
import { getExerciseById } from '@/content/exercises';
import { getModuleById } from '@/content/modules';
import { resourceGroups } from '@/content/resources';
import type { ResourceGroup, ResourceItem } from '@/content/resources';

const groupIcon: Record<ResourceGroup['id'], typeof FileText> = {
  basics: BookOpen,
  articles: FileText,
  templates: TerminalSquare,
  references: BookOpen,
};

const groupMeta: Record<ResourceGroup['id'], string> = {
  basics: 'Rust Basics',
  articles: 'Article Index',
  templates: 'Rust Patterns',
  references: 'Concept Ledger',
};

function ResourceLinks({ item }: { item: ResourceItem }) {
  const moduleInfo = item.moduleId ? getModuleById(item.moduleId) : undefined;
  const exercise = item.exerciseId ? getExerciseById(item.exerciseId) : undefined;

  return (
    <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
      {item.body ? (
        <Link href={`/resources/${item.id}`} className="text-link hover:underline">
          阅读全文
        </Link>
      ) : null}
      {moduleInfo ? (
        <Link href={`/learn/${moduleInfo.id}`} className="text-link hover:underline">
          {moduleInfo.title}
        </Link>
      ) : null}
      {exercise ? (
        <Link href={`/exercise/${exercise.id}`} className="text-link hover:underline">
          练：{exercise.title}
        </Link>
      ) : null}
    </div>
  );
}

function ResourceCard({ item, featured = false }: { item: ResourceItem; featured?: boolean }) {
  const isTemplate = Boolean(item.code);

  return (
    <article
      className={`group flex min-w-0 flex-col border border-line shadow-card transition hover:-translate-y-0.5 hover:border-brand ${
        isTemplate ? 'bg-[#15181d] p-0 text-[#f4f0e8]' : 'bg-panel p-5'
      }`}
    >
      <div className={isTemplate ? 'p-5' : ''}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-fg3">
          <span
            className={
              isTemplate
                ? 'border border-white/10 bg-white/8 px-2 py-0.5 text-[#c9c3b8]'
                : 'border border-line bg-panel2 px-2 py-0.5 text-fg2'
            }
          >
            {item.category}
          </span>
          <span className={isTemplate ? 'text-[#8f968f]' : ''}>{item.level}</span>
        </div>
        <h3
          className={`${
            featured ? 'mt-8 text-3xl leading-tight' : 'mt-4 text-lg leading-6'
          } font-black ${isTemplate ? 'text-[#fffaf0]' : 'text-fg'}`}
        >
          {item.title}
        </h3>
        <p className={`mt-3 text-sm leading-6 ${isTemplate ? 'text-[#c9c3b8]' : 'text-fg2'}`}>
          {item.summary}
        </p>
      </div>
      {item.code ? (
        <pre className="overflow-x-auto border-y border-white/10 bg-[#101217] p-4 text-xs leading-6 text-[#e6e9ef]">
          <code>{item.code}</code>
        </pre>
      ) : null}
      <div className={`flex flex-wrap gap-1.5 ${isTemplate ? 'p-5 pt-4' : 'mt-5'}`}>
        {item.tags.map((tag) => (
          <span
            key={tag}
            className={
              isTemplate
                ? 'border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-[#8f968f]'
                : 'border border-line bg-panel2 px-2 py-0.5 text-xs text-fg3'
            }
          >
            {tag}
          </span>
        ))}
      </div>
      <div className={isTemplate ? 'px-5 pb-5' : ''}>
        <ResourceLinks item={item} />
      </div>
    </article>
  );
}

export default function ResourcesPage() {
  const resourceCount = resourceGroups.reduce((total, group) => total + group.items.length, 0);

  return (
    <main className="w-full overflow-hidden bg-bg">
      <EditorialPanel className="bg-[#07090d]" innerClassName="items-center">
        <header className="reveal-in grid w-full gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
          <div className="border-t border-line pt-6">
            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.24em] text-brand">
              <Library size={16} />
              FIELD LIBRARY
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-none text-fg sm:text-7xl">
              Rust 实战资料库
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-fg2">
              把后端实战问题、代码模板和概念速查放在一起。内容将在后续任务中补齐。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/exercise/m1-01"
                className="inline-flex items-center gap-2 bg-brand px-5 py-3 font-bold text-white transition hover:bg-brand-hover"
              >
                <Play size={16} /> 立即开练
              </Link>
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 border border-line bg-panel2 px-5 py-3 font-semibold text-fg transition hover:border-brand"
              >
                看路线图
              </Link>
            </div>
          </div>
          <div className="grid gap-px bg-line shadow-card sm:grid-cols-3 lg:grid-cols-1">
            <div className="bg-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-fg3">Entries</p>
              <p className="mt-3 text-4xl font-black text-fg">{resourceCount}</p>
            </div>
            <div className="bg-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-fg3">Sections</p>
              <p className="mt-3 text-4xl font-black text-fg">{resourceGroups.length}</p>
            </div>
            <div className="bg-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-fg3">Mode</p>
              <p className="mt-3 text-xl font-black text-fg">Practice</p>
            </div>
          </div>
        </header>
      </EditorialPanel>

      {resourceGroups.map((group) => {
        const Icon = groupIcon[group.id];
        return (
          <EditorialPanel
            key={group.id}
            ariaLabelledBy={`${group.id}-title`}
            className={group.id === 'templates' ? 'bg-[#0b0d12]' : 'bg-[#07090d]'}
            innerClassName="items-center"
          >
            <div className="w-full">
              <div className="grid gap-6 border-t border-line pt-6 md:grid-cols-[0.72fr_1.28fr] md:items-end">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.22em] text-brand">
                    <Icon size={16} />
                    {groupMeta[group.id]}
                  </p>
                  <h2
                    id={`${group.id}-title`}
                    className="mt-5 text-5xl font-black leading-none text-fg sm:text-7xl"
                  >
                    {group.title}
                  </h2>
                </div>
                <p className="max-w-2xl text-base leading-8 text-fg2 md:justify-self-end">
                  {group.summary}
                </p>
              </div>
              <div className="mt-10 grid gap-px bg-line shadow-card md:grid-cols-2">
                {group.items.map((item, index) => (
                  <ResourceCard key={item.id} item={item} featured={index === 0} />
                ))}
              </div>
            </div>
          </EditorialPanel>
        );
      })}
    </main>
  );
}
