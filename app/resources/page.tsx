import Link from 'next/link';
import { BookOpen, FileText, Library, Play, TerminalSquare } from 'lucide-react';
import { EditorialPanel } from '@/components/EditorialPanel';
import { getExerciseById } from '@/content/exercises';
import { getModuleById } from '@/content/modules';
import { getProjectById } from '@/content/projects';
import { resourceGroups, scenarioCards } from '@/content/resources';
import type { ResourceGroup, ResourceItem } from '@/content/resources';

const groupIcon: Record<ResourceGroup['id'], typeof FileText> = {
  jd: BookOpen,
  interview: FileText,
  cheatsheet: TerminalSquare,
};

function ResourceLinks({ item }: { item: ResourceItem }) {
  const moduleInfo = item.moduleId ? getModuleById(item.moduleId) : undefined;
  const exercise = item.exerciseId ? getExerciseById(item.exerciseId) : undefined;
  const project = item.projectId ? getProjectById(item.projectId) : undefined;

  return (
    <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
      {item.body ? (
        <Link href={`/resources/${item.id}`} className="text-link hover:underline">
          阅读全文
        </Link>
      ) : null}
      {moduleInfo ? (
        <Link href={`/learn/${moduleInfo.id}`} className="text-link hover:underline">
          模块：{moduleInfo.title}
        </Link>
      ) : null}
      {exercise ? (
        <Link href={`/exercise/${exercise.id}`} className="text-link hover:underline">
          练：{exercise.title}
        </Link>
      ) : null}
      {project ? (
        <Link href={`/project/${project.id}`} className="text-link hover:underline">
          项目：{project.title}
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
              求职资料库
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-fg2">
              基于 2026-07 Indeed 加拿大 / 美国岗位调研整理：JD 要什么、面试问什么、写代码时翻什么。
              每一条能力都接回本站对应的模块与实战项目。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 bg-brand px-5 py-3 font-bold text-white transition hover:bg-brand-hover"
              >
                <Play size={16} /> 按路线开始学
              </Link>
              <Link
                href="#cheatsheet-title"
                className="inline-flex items-center gap-2 border border-line bg-panel2 px-5 py-3 font-semibold text-fg transition hover:border-brand"
              >
                直接看速查表
              </Link>
            </div>
          </div>
          <div className="grid gap-px bg-line shadow-card sm:grid-cols-3 lg:grid-cols-1">
            <div className="bg-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-fg3">条目</p>
              <p className="mt-3 text-4xl font-black text-fg">{resourceCount}</p>
            </div>
            <div className="bg-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-fg3">分区</p>
              <p className="mt-3 text-4xl font-black text-fg">{resourceGroups.length}</p>
            </div>
            <div className="bg-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-fg3">数据来源</p>
              <p className="mt-3 text-xl font-black text-fg">2026-07 JD</p>
            </div>
          </div>
        </header>
      </EditorialPanel>

      {scenarioCards.length > 0 ? (
        <section className="border-b border-line bg-panel px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-brand">
              岗位场景 / Scenarios
            </p>
            <div className="mt-6 grid gap-px border border-line bg-line md:grid-cols-3">
              {scenarioCards.map((card, index) => (
                <article key={card.title} className="bg-bg p-6">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-fg3">
                    Case {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-4 text-xl font-black leading-snug text-fg">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-fg2">{card.question}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-line bg-panel2 px-2 py-0.5 text-xs text-fg3"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={card.exerciseId ? `/exercise/${card.exerciseId}` : `/learn/${card.moduleId}`}
                    className="mt-6 inline-flex text-sm font-bold text-link hover:underline"
                  >
                    去对应模块
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {resourceGroups.map((group) => {
        const Icon = groupIcon[group.id];
        return (
          <EditorialPanel
            key={group.id}
            ariaLabelledBy={`${group.id}-title`}
            className={group.id === 'interview' ? 'bg-[#0b0d12]' : 'bg-[#07090d]'}
            innerClassName="items-center"
          >
            <div className="w-full">
              <div className="grid gap-6 border-t border-line pt-6 md:grid-cols-[0.72fr_1.28fr] md:items-end">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.22em] text-brand">
                    <Icon size={16} />
                    {group.eyebrow}
                    <span className="text-fg3">{group.items.length} 条</span>
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
