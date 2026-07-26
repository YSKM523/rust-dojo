import { getExerciseById, exerciseNav } from '@/content/exercises';
import { EditorialPanel } from '@/components/EditorialPanel';
import { Playground } from '@/components/Playground';
import { ExerciseNavBar } from '@/components/ExerciseNavBar';
import { notFound } from 'next/navigation';
import { LessonView } from '@/components/LessonView';

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = getExerciseById(id);
  if (!exercise) notFound();
  const nav = exerciseNav(exercise.id);

  return (
    <main className="w-full overflow-hidden bg-bg">
      <EditorialPanel className="bg-[#07090d]" innerClassName="items-start">
        <div className="w-full space-y-5">
          <header className="reveal-in border border-line bg-panel/92 p-6 shadow-card">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand">
              RUST WORKBENCH
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="text-sm font-semibold text-fg3">
                  {exercise.moduleId.toUpperCase()} · 难度 {exercise.difficulty}
                </p>
                <h1 className="mt-2 text-4xl font-black leading-tight text-fg">{exercise.title}</h1>
              </div>
              <div className="border border-line bg-panel2 px-4 py-3 text-sm text-fg2">
                真实 rustc · Playground 判题
              </div>
            </div>
          </header>
          <section className="border border-line bg-panel p-5 text-fg2 shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-fg3">练习要求</p>
            <div className="mt-3 leading-7">
              <LessonView markdown={exercise.prompt} />
            </div>
          </section>
          <Playground exercise={exercise} />
          {nav && <ExerciseNavBar nav={nav} />}
        </div>
      </EditorialPanel>
    </main>
  );
}
