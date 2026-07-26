import Link from 'next/link';
import { ChevronLeft, Terminal } from 'lucide-react';
import { notFound } from 'next/navigation';
import { EditorialPanel } from '@/components/EditorialPanel';
import { LessonView } from '@/components/LessonView';
import { ProjectChecklist } from '@/components/ProjectChecklist';
import { allProjects, getProjectById } from '@/content/projects';
import { getModuleById } from '@/content/modules';

export function generateStaticParams() {
  return allProjects.map((project) => ({ id: project.id }));
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) notFound();

  const afterModule = getModuleById(project.afterModuleId);

  return (
    <main className="w-full overflow-hidden bg-bg">
      <EditorialPanel className="bg-bg2" innerClassName="items-start">
        <article className="w-full">
          <Link href="/learn" className="inline-flex items-center gap-1 text-sm font-bold text-link">
            <ChevronLeft size={15} /> 返回路线图
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <header className="border-t border-line pt-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-brand">
                实战项目 {project.id.toUpperCase()} / 本地 cargo
              </p>
              <h1 className="mt-5 text-5xl font-black leading-none text-fg sm:text-7xl">
                {project.title}
              </h1>
              <p className="mt-6 text-base leading-8 text-fg2">{project.summary}</p>

              <div className="mt-8 flex items-start gap-3 border border-line bg-panel p-4 text-sm leading-6 text-fg2">
                <Terminal size={16} className="mt-0.5 shrink-0 text-brand" />
                <p>
                  这个项目在你自己的机器上用 cargo 完成，网站不编译、不评分——照着下面的题面动手，
                  每验收一条就在清单里勾一下，进度和练习记在一起。
                </p>
              </div>

              {afterModule ? (
                <div className="mt-6">
                  <Link
                    href={`/learn/${afterModule.id}`}
                    className="inline-flex items-center gap-2 border border-line bg-panel2 px-5 py-3 text-sm font-bold text-link transition hover:border-brand hover:text-white"
                  >
                    前置模块：{afterModule.title}
                  </Link>
                </div>
              ) : null}
            </header>

            <div className="grid gap-8">
              <section className="border border-line bg-panel p-5 shadow-card sm:p-7">
                <LessonView markdown={project.brief} />
              </section>
              <ProjectChecklist project={project} />
            </div>
          </div>
        </article>
      </EditorialPanel>
    </main>
  );
}
