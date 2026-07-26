import type { ReactNode } from 'react';
import Link from 'next/link';
import { allModules } from '@/content/modules';
import { allExercises, exercisesByModule } from '@/content/exercises';
import { EditorialPanel } from '@/components/EditorialPanel';
import { ModuleCard } from '@/components/ModuleCard';
import { ProjectCard } from '@/components/ProjectCard';
import { allProjects, projectsByModule } from '@/content/projects';

export default function LearnPage() {
  // 路线图 = 模块卡按顺序排列，每个模块后面紧跟挂在它下面的实战项目卡。
  const roadmap: ReactNode[] = [];
  for (const m of allModules) {
    roadmap.push(
      <ModuleCard key={m.id} module={m} exerciseIds={exercisesByModule(m.id).map((e) => e.id)} />,
    );
    for (const p of projectsByModule(m.id)) {
      roadmap.push(<ProjectCard key={p.id} project={p} />);
    }
  }
  // 前置模块还没上线的项目照样展示在末尾，不让它们凭空消失。
  for (const p of allProjects) {
    if (!allModules.some((m) => m.id === p.afterModuleId)) {
      roadmap.push(<ProjectCard key={p.id} project={p} />);
    }
  }

  return (
    <main className="w-full overflow-hidden bg-bg">
      <EditorialPanel className="bg-[#07090d]" innerClassName="items-center">
        <div className="w-full">
          <header className="reveal-in grid gap-8 border-t border-line pt-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-brand">
                TRAINING ROUTE
              </p>
              <h1 className="mt-5 text-5xl font-black leading-none text-fg sm:text-7xl">
                训练路径
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-fg2">
                从所有权与借用到异步后端和生产化。8 个模块按学习曲线排列，也可以直接按问题跳进练习场。
              </p>
              <p className="mt-6 text-sm text-fg3">
                <Link href="/" className="font-semibold text-link hover:underline">
                  首页
                </Link>{' '}
                / 学习路线图
              </p>
            </div>
            <div className="grid gap-px bg-line shadow-card sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-panel p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-fg3">Modules</p>
                <p className="mt-3 text-4xl font-black text-fg">{allModules.length}</p>
              </div>
              <div className="bg-panel p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-fg3">Exercises</p>
                <p className="mt-3 text-4xl font-black text-fg">{allExercises.length}</p>
              </div>
              <div className="bg-panel p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-fg3">Projects</p>
                <p className="mt-3 text-4xl font-black text-fg">{allProjects.length}</p>
              </div>
              <div className="bg-panel p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-fg3">Level</p>
                <p className="mt-3 text-xl font-black text-fg">Beginner → Senior</p>
              </div>
            </div>
          </header>

          <div className="mt-10 grid gap-px bg-line shadow-card sm:grid-cols-2 lg:grid-cols-4">
            {roadmap}
          </div>
        </div>
      </EditorialPanel>
    </main>
  );
}
