import Link from 'next/link';
import { ArrowRight, CheckSquare, Map, Play, TerminalSquare } from 'lucide-react';
import { EditorialPanel } from '@/components/EditorialPanel';
import { CountUp } from '@/components/fx/CountUp';
import { HeroTerminal } from '@/components/fx/HeroTerminal';
import { Magnetic } from '@/components/fx/Magnetic';
import { Marquee } from '@/components/fx/Marquee';
import { ModuleLadder } from '@/components/fx/ModuleLadder';
import { Reveal } from '@/components/fx/Reveal';
import { allExercises } from '@/content/exercises';
import { allModules, getModuleById } from '@/content/modules';
import { allProjects } from '@/content/projects';
import { featuredResources } from '@/content/resources';

const heroSpecs = [
  { label: '定位', value: '按真实 JD 需求设计的中文 Rust 后端实战路线' },
  { label: '终点', value: '能独立写、能读懂、能维护一个生产级 Rust 后端服务' },
  { label: '判题', value: '浏览器内调用 Rust Playground 真实编译运行' },
];

const stats = [
  {
    value: allModules.length || 8,
    suffix: '',
    label: '大模块',
    caption: '从所有权到生产化',
    block: 'bg-brand',
  },
  {
    value: allExercises.length || 60,
    suffix: allExercises.length ? '' : '+',
    label: '交互练习',
    caption: '写完即时判题',
    block: 'bg-sky-700',
  },
  {
    value: allProjects.length || 4,
    suffix: '',
    label: '本地实战项目',
    caption: 'cargo 真项目',
    block: 'bg-emerald-700',
  },
  { value: 3, suffix: '', label: '种判题模式', caption: '输出 / 编译 / 测试', block: 'bg-violet-700' },
];

const jdKeywords = [
  'OWNERSHIP',
  'TOKIO',
  'AXUM',
  'SQLX',
  'SERDE',
  'SEND + SYNC',
  'ASYNC / AWAIT',
  'TRAIT',
  'LIFETIME',
  'POSTGRESQL',
  'GRPC',
  'DOCKER · CI',
];

const whyRust = [
  {
    index: '01',
    accentText: 'text-brand',
    accentBar: 'border-brand',
    title: '云后端是最大的需求方向',
    body: 'Rust 岗位集中在四类：云后端服务、交易与量化系统、区块链、基础设施与编译器。其中云后端占比最大，JD 里反复出现的是 tokio、axum/actix、sqlx、gRPC 与 Kubernetes——本站的路线就沿着这条主线铺。',
    tag: 'tokio · axum · sqlx',
  },
  {
    index: '02',
    accentText: 'text-sky-700 dark:text-sky-400',
    accentBar: 'border-sky-600',
    title: '薪资锚点写在招聘页上',
    body: 'Sangoma 的加拿大远程 Senior Backend Developer (Rust) 公开区间 120,000–135,000 CAD；美国侧 EngFlow 160,000–220,000 USD、Radar 200,000–300,000 USD。这些是 2026-07 抓到的挂牌数字，不是市场推断。',
    tag: '2026-07 公开挂牌',
  },
  {
    index: '03',
    accentText: 'text-emerald-700 dark:text-emerald-400',
    accentBar: 'border-emerald-600',
    title: '内存安全正在推动迁移',
    body: '内存安全缺陷长期占据 C/C++ 代码库严重漏洞的主要部分，监管与大厂都在推动关键组件用内存安全语言重写。这类岗位要的不是“会写语法”，而是能讲清所有权与并发模型的人。',
    tag: '行业趋势',
  },
  {
    index: '04',
    accentText: 'text-violet-700 dark:text-violet-400',
    accentBar: 'border-violet-600',
    title: '门槛在心智模型，不在语法',
    body: '面试真正深挖的是所有权取舍、生命周期标注、静态与动态分发、Send + Sync、async 的阻塞与取消陷阱、unsafe 的边界。这些正是本站练习与面试题库的重心。',
    tag: '面试主战场',
  },
];

const routePlan = [
  { id: 'm1', title: '起步与所有权', summary: '变量、控制流、move、借用与切片，建立不靠 GC 的内存直觉。' },
  { id: 'm2', title: '结构体、枚举与模式匹配', summary: '用类型建模领域，Option 与 Result 入门。' },
  { id: 'm3', title: 'trait、泛型与生命周期', summary: '写得出抽象层：约束、分发方式与借用标注。' },
  { id: 'm4', title: '迭代器、智能指针与 serde', summary: '日常手感层，外加单元测试与 JSON 序列化。' },
  { id: 'm5', title: '线程与并发', summary: 'channel、Mutex、Arc，以及 Send + Sync 到底约束了什么。' },
  { id: 'm6', title: 'async 与 tokio', summary: 'Future 的惰性、任务调度，以及阻塞运行时的经典事故。' },
  { id: 'm7', title: 'axum + sqlx + WebSocket', summary: '把 handler 写成可测试的纯函数，接上数据库与实时通道。' },
  { id: 'm8', title: '生产化与求职', summary: 'tracing、Docker、CI，以及 JD 对照与面试题库。' },
];

const methods = [
  {
    icon: TerminalSquare,
    chip: 'bg-brand text-white',
    label: '浏览器内真编译',
    title: '写完就判，报错就是 rustc 报错',
    body: '每道练习直接提交到 Rust Playground 编译运行，返回真实的编译器诊断。三种判题模式：比对标准输出、要求通过编译、跑隐藏测试。',
  },
  {
    icon: Play,
    chip: 'bg-sky-700 text-white',
    label: '本地 cargo 实战',
    title: '四个能放进简历的小项目',
    body: 'mini-grep、带持久化的 todo CLI、tokio 并发抓取器、axum + sqlx + WebSocket 完整后端。项目在你自己的机器上用 cargo 跑，和上班时一样。',
  },
  {
    icon: CheckSquare,
    chip: 'bg-emerald-700 text-white',
    label: '验收清单',
    title: '完成的标准是写死的',
    body: '每个项目配一份可勾选的验收清单，含可复制的测试命令。练习与清单共用同一套进度，登录后云端同步，换设备继续。',
  },
];

function SectionHead({
  id,
  kicker,
  title,
  lede,
}: {
  id: string;
  kicker: string;
  title: string;
  lede: string;
}) {
  return (
    <Reveal>
      <div className="grid gap-6 border-t border-line pt-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-brand">
            {kicker}
          </p>
          <h2 id={id} className="mt-5 text-5xl font-black leading-none text-fg sm:text-7xl">
            {title}
          </h2>
        </div>
        <p className="max-w-2xl text-base leading-8 text-fg2 lg:justify-self-end">{lede}</p>
      </div>
    </Reveal>
  );
}

export default function Home() {
  const ladderRows = routePlan.map((row) => {
    const authored = getModuleById(row.id);
    return {
      id: row.id,
      title: authored?.title ?? row.title,
      summary: authored?.summary ?? row.summary,
      href: authored ? `/learn/${row.id}` : '/learn',
      tier: authored?.tierLabel ?? '制作中',
      tierKey: authored?.tierKey,
    };
  });

  return (
    <main className="w-full bg-bg">
      <section className="border-b border-line bg-bg2 px-4 pb-14 pt-12 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
        <div className="w-full">
          <div className="fx-hero-item flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-fg3">
            <span className="font-bold text-brand">RUST DOJO</span>
            <span className="hidden h-px w-10 bg-brand sm:block" />
            <span>真实 rustc 判题</span>
            <span aria-hidden>·</span>
            <span>Rust Playground</span>
            <span aria-hidden>·</span>
            <span>中文 · 后端方向</span>
          </div>

          <div className="fx-hero-item mt-8" style={{ ['--fx-delay' as string]: '80ms' }}>
            <HeroTerminal />
          </div>

          <h1
            className="fx-hero-item mt-6 text-[clamp(3.25rem,13vw,10rem)] font-black leading-[0.86] tracking-tight text-fg"
            style={{ ['--fx-delay' as string]: '180ms' }}
          >
            Rust 道场
          </h1>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="fx-hero-item" style={{ ['--fx-delay' as string]: '320ms' }}>
              <p className="max-w-2xl text-xl leading-9 text-fg2 sm:text-2xl sm:leading-10">
                从 0 到生产级后端，按 2026 真实招聘需求设计。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Magnetic>
                  <Link
                    href="/learn"
                    className="fx-press inline-flex items-center gap-2 bg-brand px-6 py-3.5 font-bold text-white transition hover:bg-brand-hover"
                  >
                    <Play size={16} /> 开始学习
                  </Link>
                </Magnetic>
                <Link
                  href="/resources"
                  className="fx-press inline-flex items-center gap-2 border border-line bg-panel2 px-6 py-3.5 font-semibold text-fg transition hover:border-brand hover:text-brand"
                >
                  <Map size={16} /> 求职地图
                </Link>
              </div>
            </div>

            <dl className="fx-hero-item border-t border-line" style={{ ['--fx-delay' as string]: '440ms' }}>
              {heroSpecs.map((spec) => (
                <div
                  key={spec.label}
                  className="grid grid-cols-[64px_1fr] gap-4 border-b border-line py-4"
                >
                  <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-fg3">
                    {spec.label}
                  </dt>
                  <dd className="text-sm leading-6 text-fg2">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <Marquee items={jdKeywords} className="bg-bg2" />

      <section aria-label="平台规模" className="border-b border-line bg-bg2 px-4 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-2 gap-px bg-white/25 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`${stat.block} px-5 py-8 sm:px-6`}>
              <p className="text-5xl font-black leading-none text-white sm:text-6xl">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-3 text-sm font-bold text-white">{stat.label}</p>
              <p className="mt-1 text-xs leading-5 text-white/90">{stat.caption}</p>
            </div>
          ))}
        </div>
      </section>

      <EditorialPanel ariaLabelledBy="why-rust-title" className="bg-bg2" innerClassName="items-center">
        <div className="w-full">
          <SectionHead
            id="why-rust-title"
            kicker="Why Rust / 岗位事实"
            title="为什么是 Rust"
            lede="下面四条都来自 2026-07 Indeed 加拿大 / 美国岗位与公开招聘页的调研，不是感想。路线的每一个模块都能回溯到其中一条需求。"
          />

          <div className="mt-10 grid gap-px border border-line bg-line md:grid-cols-2">
            {whyRust.map((card, index) => (
              <Reveal key={card.index} delay={index * 90} className="bg-panel">
                <article
                  className={`group h-full border-t-2 ${card.accentBar} p-6 transition-colors duration-300 hover:bg-panel2 sm:p-8`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span
                      className={`font-mono text-5xl font-black leading-none ${card.accentText} transition-transform duration-300 group-hover:-translate-y-1`}
                    >
                      {card.index}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg3">
                      {card.tag}
                    </span>
                  </div>
                  <h3 className="mt-8 text-2xl font-black leading-snug text-fg">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-fg2">{card.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </EditorialPanel>

      <EditorialPanel ariaLabelledBy="route-title" className="bg-bg3" innerClassName="items-center">
        <div className="w-full">
          <SectionHead
            id="route-title"
            kicker="Route / 01 — 08"
            title="八个模块"
            lede="顺序即难度：前四个模块解决“看得懂、写得出”，后四个模块解决“能上线、能扛住并发”。每个模块后面挂练习，关键节点挂本地实战项目。"
          />

          <ModuleLadder rows={ladderRows} />

          <Link
            href="/learn"
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-link hover:underline"
          >
            查看完整学习路线图 <ArrowRight size={15} />
          </Link>
        </div>
      </EditorialPanel>

      <EditorialPanel ariaLabelledBy="method-title" className="bg-bg2" innerClassName="items-center">
        <div className="w-full">
          <SectionHead
            id="method-title"
            kicker="Method / 怎么练"
            title="学习方式"
            lede="小题在浏览器里跑，大项目在你自己的终端里跑，验收标准写在清单上。不背语法，只留下能带走的工程习惯。"
          />

          <div className="mt-10 grid gap-px border border-line bg-line md:grid-cols-3">
            {methods.map((method, index) => {
              const Icon = method.icon;
              return (
                <Reveal key={method.label} delay={index * 100} className="bg-panel">
                  <article className="flex h-full flex-col p-6 transition-colors duration-300 hover:bg-panel2 sm:p-8">
                    <div className={`flex h-10 w-10 items-center justify-center ${method.chip}`}>
                      <Icon size={18} />
                    </div>
                    <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-fg3">
                      {method.label}
                    </p>
                    <h3 className="mt-3 text-xl font-black leading-snug text-fg">{method.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-fg2">{method.body}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>

          {featuredResources.length > 0 ? (
            <div className="mt-12 border-t border-line pt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-brand">
                  求职地图 / 精选
                </p>
                <Link
                  href="/resources"
                  className="inline-flex items-center gap-2 text-sm font-bold text-link hover:underline"
                >
                  全部资源 <ArrowRight size={15} />
                </Link>
              </div>
              <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
                {featuredResources.map((item, index) => (
                  <Reveal key={item.id} delay={index * 70} className="bg-panel">
                    <Link
                      href={`/resources/${item.id}`}
                      className="group block h-full p-5 transition-colors hover:bg-panel2"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg3">
                        {item.category}
                      </p>
                      <h3 className="mt-3 text-base font-black leading-snug text-fg group-hover:text-brand">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-fg2">{item.summary}</p>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </EditorialPanel>
    </main>
  );
}
