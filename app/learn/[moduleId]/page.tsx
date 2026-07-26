import { getModuleById } from '@/content/modules';
import { exercisesByModule } from '@/content/exercises';
import { EditorialPanel } from '@/components/EditorialPanel';
import { LessonView } from '@/components/LessonView';
import { ExerciseListClient } from '@/components/ExerciseListClient';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function ModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const mod = getModuleById(moduleId);
  if (!mod) notFound();
  const exercises = exercisesByModule(mod.id);

  return (
    <main className="w-full overflow-hidden bg-bg">
      <EditorialPanel className="bg-bg2" innerClassName="items-start">
        <div className="w-full">
          <Link href="/learn" className="inline-flex items-center gap-1 text-sm font-bold text-link">
            <ChevronLeft size={15} /> 返回路线图
          </Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-[0.68fr_1.32fr]">
            <header className="border-t border-line pt-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-brand">
                MODULE {mod.order} / {mod.tierLabel}
              </p>
              <h1 className="mt-5 text-5xl font-black leading-none text-fg sm:text-7xl">
                {mod.title}
              </h1>
              <p className="mt-6 text-base leading-8 text-fg2">{mod.summary}</p>
            </header>
            <div className="grid gap-8">
              <LessonView markdown={mod.lesson} />
              <section className="border-t border-line pt-6">
                <h2 className="mb-4 text-xl font-black text-fg">练习（{exercises.length}）</h2>
                <ExerciseListClient exercises={exercises} />
              </section>
            </div>
          </div>
        </div>
      </EditorialPanel>
    </main>
  );
}
