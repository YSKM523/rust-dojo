import Link from 'next/link';
import { ChevronLeft, Play } from 'lucide-react';
import { notFound } from 'next/navigation';
import { EditorialPanel } from '@/components/EditorialPanel';
import { LessonView } from '@/components/LessonView';
import { getExerciseById } from '@/content/exercises';
import { getModuleById } from '@/content/modules';
import { getProjectById } from '@/content/projects';
import { allResourceItems, getResourceById } from '@/content/resources';

export function generateStaticParams() {
  return allResourceItems.filter((item) => item.body).map((item) => ({ id: item.id }));
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resource = getResourceById(id);
  if (!resource?.body) notFound();

  const moduleInfo = resource.moduleId ? getModuleById(resource.moduleId) : undefined;
  const exercise = resource.exerciseId ? getExerciseById(resource.exerciseId) : undefined;
  const project = resource.projectId ? getProjectById(resource.projectId) : undefined;

  return (
    <main className="w-full overflow-hidden bg-bg">
      <EditorialPanel className="bg-[#07090d]" innerClassName="items-start">
        <article className="w-full">
          <Link href="/resources" className="inline-flex items-center gap-1 text-sm font-bold text-link">
            <ChevronLeft size={15} /> 返回资料库
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <header className="border-t border-line pt-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-brand">
                {resource.category} / {resource.readingTime ?? 'short read'}
              </p>
              <h1 className="mt-5 text-5xl font-black leading-none text-fg sm:text-7xl">
                {resource.title}
              </h1>
              <p className="mt-6 text-base leading-8 text-fg2">{resource.summary}</p>
              <div className="mt-6 flex flex-wrap gap-1.5">
                {resource.tags.map((tag) => (
                  <span key={tag} className="border border-line bg-panel2 px-2 py-0.5 text-xs text-fg3">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {exercise ? (
                  <Link
                    href={`/exercise/${exercise.id}`}
                    className="inline-flex items-center gap-2 bg-brand px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-hover"
                  >
                    <Play size={16} /> 练：{exercise.title}
                  </Link>
                ) : null}
                {moduleInfo ? (
                  <Link
                    href={`/learn/${moduleInfo.id}`}
                    className="inline-flex items-center gap-2 border border-line bg-panel2 px-5 py-3 text-sm font-bold text-link transition hover:border-brand hover:text-white"
                  >
                    模块：{moduleInfo.title}
                  </Link>
                ) : null}
                {project ? (
                  <Link
                    href={`/project/${project.id}`}
                    className="inline-flex items-center gap-2 border border-line bg-panel2 px-5 py-3 text-sm font-bold text-link transition hover:border-brand hover:text-white"
                  >
                    项目：{project.title}
                  </Link>
                ) : null}
              </div>
            </header>

            <section className="border border-line bg-panel p-5 shadow-card sm:p-7">
              <LessonView markdown={resource.body} />
            </section>
          </div>
        </article>
      </EditorialPanel>
    </main>
  );
}
