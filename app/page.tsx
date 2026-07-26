import Link from 'next/link';
import { ArrowRight, BookOpen, Database, Library, Map, Play, TerminalSquare } from 'lucide-react';
import { EditorialPanel } from '@/components/EditorialPanel';
import { allExercises } from '@/content/exercises';
import { allModules } from '@/content/modules';
import { featuredResources, scenarioCards } from '@/content/resources';

const heroCode = `fn main() {
    let handles: Vec<_> = (1..=4)
        .map(|n| std::thread::spawn(move || n * n))
        .collect();

    let total: i32 = handles
        .into_iter()
        .map(|handle| handle.join().unwrap())
        .sum();
    println!("{total}");
}`;

const stats = [
  { label: 'Modules', value: allModules.length.toString(), caption: 'structured route' },
  { label: 'Exercises', value: allExercises.length.toString(), caption: 'browser judged' },
  { label: 'Runtime', value: 'Stable', caption: 'remote compiler' },
  { label: 'Library', value: featuredResources.length.toString(), caption: 'field notes' },
];

const routePreview = allModules.slice(0, 4);

export default function Home() {
  return (
    <main className="w-full overflow-hidden bg-bg">
      <section className="reveal-in relative isolate min-h-[calc(100svh-58px)] overflow-hidden border-b border-white/10 px-4 py-5 text-[#fff8ed] sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[#050609]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#050609_0%,rgba(5,6,9,0.88)_32%,rgba(5,6,9,0.5)_62%,rgba(5,6,9,0.28)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,6,9,0.04)_0%,rgba(5,6,9,0.24)_48%,rgba(5,6,9,0.82)_100%),radial-gradient(circle_at_74%_46%,rgba(185,90,10,0.18),transparent_34%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:76px_76px] opacity-70" />

        <div className="relative z-10 flex min-h-[calc(100svh-98px)] flex-col gap-7 lg:block">
          <div className="order-1 lg:absolute lg:left-0 lg:top-0 lg:w-[360px]">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-brand">
              SYSTEM / 01
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#f09a3b]">
              <span>LIVE RUST TRAINING SYSTEM</span>
              <span className="h-px w-10 bg-brand" />
              <span className="text-[#aaa396]">Rust Playground</span>
            </div>
          </div>

          <div className="order-4 lg:absolute lg:right-0 lg:top-0 lg:w-[430px]">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-brand lg:text-right">
              SIGNALS / 02
            </p>
            <div className="mt-3 grid grid-cols-2 border border-white/10 sm:grid-cols-4 lg:grid-cols-2">
              {stats.map((stat) => (
                <div key={stat.label} className="border-white/10 p-4 odd:border-r lg:border-b lg:[&:nth-child(n+3)]:border-b-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#858d8a]">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#fffaf0]">{stat.value}</p>
                  <p className="mt-1 text-xs text-[#aaa396]">{stat.caption}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="order-3 min-w-0 lg:absolute lg:left-[47%] lg:top-[48%] lg:w-[min(520px,38vw)] lg:-translate-x-1/2 lg:-translate-y-1/2">
            <div className="border border-white/12 bg-[#11151c]/92 shadow-[0_34px_120px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
                    CODE STAGE
                  </p>
                  <h2 className="mt-1 text-lg font-black text-[#fffaf0]">并发任务汇总</h2>
                </div>
                <TerminalSquare className="text-[#8f968f]" size={20} />
              </div>
              <pre className="max-h-[300px] overflow-x-auto border-b border-white/10 p-4 text-xs leading-5 text-[#e8e1d4] sm:text-sm lg:max-h-[300px]">
                <code>{heroCode}</code>
              </pre>
              <div className="grid gap-px bg-white/10 sm:grid-cols-3">
                <div className="bg-[#11151c] p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#8f968f]">Result</p>
                  <p className="mt-2 text-2xl font-black text-[#fffaf0]">30</p>
                </div>
                <div className="bg-[#11151c] p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#8f968f]">Pattern</p>
                  <p className="mt-2 font-bold text-[#fffaf0]">ownership + threads</p>
                </div>
                <div className="bg-[#11151c] p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#8f968f]">Review</p>
                  <p className="mt-2 font-bold text-[#fffaf0]">AI ready</p>
                </div>
              </div>
            </div>
          </div>

          <div className="order-2 lg:absolute lg:bottom-0 lg:left-0 lg:max-w-[760px]">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-brand">
              IDENTITY / 03
            </p>
            <h1 className="mt-4 text-6xl font-black leading-[0.88] text-[#fffaf0] sm:text-8xl lg:text-[120px]">
              Rust 道场
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#c9c3b8]">
              一个调用 Rust Playground 真实编译运行的后端实战学习平台。用练习建立手感，用项目串联能力，用 AI 副驾复盘每一次编译。
            </p>
          </div>

          <div className="order-5 lg:absolute lg:bottom-0 lg:right-0 lg:w-[430px]">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-brand lg:text-right">
              ACTIONS / 04
            </p>
            <div className="mt-4 flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/exercise/m1-01"
                className="inline-flex items-center gap-2 rounded bg-brand px-5 py-3 font-bold text-white transition hover:bg-brand-hover"
              >
                <Play size={16} /> 立即开练
              </Link>
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 rounded border border-white/15 bg-white/8 px-5 py-3 font-semibold text-[#fffaf0] transition hover:border-brand hover:text-white"
              >
                <Library size={16} /> 进入资料库
              </Link>
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 rounded border border-white/15 px-5 py-3 font-semibold text-[#d9d2c4] transition hover:border-white/35 hover:text-white"
              >
                <Map size={16} /> 学习路线图
              </Link>
            </div>
          </div>
        </div>
      </section>

      <EditorialPanel className="bg-[#07090d]" innerClassName="items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.22em] text-brand">
              <BookOpen size={16} />
              Practice Notes
            </p>
            <h2 className="mt-5 text-5xl font-black leading-none text-fg sm:text-7xl">
              资料库精选
            </h2>
            <p className="mt-6 text-base leading-8 text-fg2">
              不是普通知识点列表，而是围绕后端实战整理的编程模式、复盘要点和代码模板。
            </p>
            <Link
              href="/resources"
              className="mt-8 inline-flex items-center gap-2 border border-line bg-panel2 px-5 py-3 text-sm font-bold text-link transition hover:border-brand hover:text-white"
            >
              进入资料库 <ArrowRight size={15} />
            </Link>
          </div>

          <div className="grid gap-px bg-line shadow-card sm:grid-cols-2">
            {featuredResources.map((item, index) => (
              <article
                key={item.id}
                className={`group min-w-0 bg-panel p-5 transition hover:bg-panel2 ${
                  index === 0 ? 'sm:row-span-2 sm:p-7' : ''
                } ${index === featuredResources.length - 1 ? 'sm:col-span-2' : ''}`}
              >
                <div className="flex items-center justify-between gap-3 text-xs text-fg3">
                  <span className="font-bold uppercase tracking-[0.14em]">{item.category}</span>
                  <span>{item.level}</span>
                </div>
                <h3
                  className={`${
                    index === 0 ? 'mt-10 text-3xl' : 'mt-4 text-lg'
                  } font-black leading-tight text-fg group-hover:text-brand`}
                >
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-fg2">{item.summary}</p>
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="border border-line bg-panel2 px-2 py-0.5 text-xs text-fg3"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </EditorialPanel>

      <EditorialPanel className="bg-[#0b0d12]" innerClassName="items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[0.66fr_1.34fr] lg:items-stretch">
          <div className="flex flex-col justify-between border-y border-line py-6">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">
                Training Route
              </p>
              <h2 className="mt-5 text-5xl font-black leading-none text-fg sm:text-7xl">
                训练路径
              </h2>
              <p className="mt-6 text-base leading-8 text-fg2">
                从所有权与借用到异步服务、数据访问和生产化，路线保留学习顺序，也能按问题直接跳转。
              </p>
            </div>
            <Link href="/learn" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-link">
              查看完整路线 <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid gap-px bg-line shadow-card sm:grid-cols-2">
            {routePreview.map((module) => (
              <Link
                key={module.id}
                href={`/learn/${module.id}`}
                className="group flex min-h-[220px] flex-col justify-between bg-panel p-6 transition hover:bg-panel2"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-fg3">
                    Module {module.order}
                  </p>
                  <span className="text-5xl font-black leading-none text-[#242a34] group-hover:text-brand">
                    {String(module.order).padStart(2, '0')}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-fg group-hover:text-brand">{module.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-fg2">{module.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </EditorialPanel>

      <EditorialPanel className="bg-[#07090d]" innerClassName="items-center">
        <div className="w-full">
          <div className="grid gap-6 border-t border-line pt-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">Scenario Map</p>
              <h2 className="mt-5 text-5xl font-black leading-none text-fg sm:text-7xl">
                从问题到 Rust
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-fg2 lg:justify-self-end">
              用后端问题做入口，直接进入对应练习，把概念变成可以编译运行的代码。
            </p>
          </div>
          <div className="mt-10 grid gap-px bg-line shadow-card md:grid-cols-3">
            {scenarioCards.map((card, index) => (
              <article key={card.title} className="group bg-panel p-6 transition hover:bg-panel2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center bg-[#15181d] text-brand">
                    <Database size={18} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-fg3">
                    Case {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-10 text-2xl font-black text-fg group-hover:text-brand">{card.title}</h3>
                <p className="mt-4 min-h-[96px] text-sm leading-6 text-fg2">{card.question}</p>
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {card.tags.map((tag) => (
                    <span key={tag} className="border border-line bg-panel2 px-2 py-0.5 text-xs text-fg3">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={card.exerciseId ? `/exercise/${card.exerciseId}` : `/learn/${card.moduleId}`}
                  className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-link"
                >
                  去练这类题 <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </EditorialPanel>
    </main>
  );
}
