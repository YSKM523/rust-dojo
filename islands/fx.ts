/**
 * fx island — 「编译器的仪式感」动效层（Reveal / CountUp / HeroTerminal /
 * Magnetic / Marquee / ModuleLadder 六个动效的零框架实现）
 *
 * CSS 语法（.fx-reveal / .fx-caret / .fx-marquee / .fx-ladder-row / .fx-magnet …）
 * 在 islands/site.css 的 fx layer，与 app/globals.css 逐字一致；本文件只负责
 * 切类名 / 改 textContent / 改内联 style，不注入任何样式。
 *
 * 语义事实源（逐参数照搬，改这里前先回去读原文件）：
 *   - components/fx/Reveal.tsx        IntersectionObserver rootMargin '0px 0px -12% 0px'、
 *                                     threshold 0.05，命中一次即 add('is-in') 并停止观察
 *   - components/fx/CountUp.tsx       threshold 0.4、duration 900ms、
 *                                     easing 1-(1-p)^3、Math.round(value*eased)
 *   - components/fx/HeroTerminal.tsx  起手 250ms、字符间隔 26ms、
 *                                     日志行 180ms / 420ms、收笔 900ms、
 *                                     sessionStorage 'rustdojo:boot' 每会话只播一次
 *   - components/fx/Magnetic.tsx      仅 pointerType==='mouse'；位移 (dx/w)*10px, (dy/h)*8px
 *   - components/fx/Marquee.tsx       内容双份 + track 位移 50%（动画纯 CSS，36s linear）
 *   - components/fx/ModuleLadder.tsx  激活行 = 距视口中心最近的行；IO threshold 0 挂/摘
 *                                     scroll 监听，rAF 节流
 *   - components/fx/reducedMotion.ts  prefersReducedMotion() 原样内联（不跨目录 import
 *                                     components/，避免 B4 删 components/ 时断链）；
 *                                     和原文件一样是**一次性探测，不监听 change 事件**
 *
 * reduced-motion 分支归属（照原组件，谁有谁没有不许自己加戏）：
 *   CountUp / HeroTerminal / Magnetic 有；Marquee / ModuleLadder 没有（CSS media
 *   query 已经处理）。Reveal.tsx 原本也没有，island 这边多一条「reduced 时直接
 *   add('is-in')」的短路——CSS 侧本就把 transition 全禁掉，终态等价，B0 起即如此。
 *
 * ============================ 挂载协议 ============================
 * Task 9 的模板按下面写 DOM。所有选择器都是 data-*，Tailwind 类名一律照搬对应 TSX。
 *
 * ---- 1. reveal（Reveal.tsx） --------------------------------------
 *
 *   <div class="fx-reveal <原 className>" data-fx="reveal" data-fx-delay="90">…</div>
 *
 *   - class 必须自带 fx-reveal（无 JS 时 CSS 保证可见；html.fx-js 下才隐藏待揭示）
 *   - data-fx-delay  可选，级联延迟毫秒数（对应 Reveal 的 delay prop，缺省 0）。
 *                    island 总会把它写成内联 style 的 --fx-delay（没写属性就写 0ms，
 *                    照 Reveal.tsx 的 `delay = 0` 默认值），所以祖先上的 --fx-delay
 *                    不会被意外继承下来。
 *
 * ---- 2. count-up（CountUp.tsx） -----------------------------------
 *
 *   <span data-fx="count-up" data-fx-value="61" data-fx-suffix="" data-fx-duration="900">61</span>
 *
 *   - 元素的 SSR 文本必须已经是终值 `${value}${suffix}`（React 的初始 state 就是终值），
 *     这样无 JS / reduced-motion / 无 IntersectionObserver 时直接是对的。
 *   - data-fx-value     必填，目标整数
 *   - data-fx-suffix    可选，数字后缀（如 "+"），缺省空串
 *   - data-fx-duration  可选，毫秒，**属性缺失或非有限数**时才回落 900（CountUp.tsx 的
 *                       `duration = 900` 默认值）。显式写 0 就是 0：`(t-t0)/0 = Infinity`
 *                       → p 直接夹到 1 → 下一帧就是终值，与 React 传 duration={0} 一致，
 *                       island 不许把它悄悄改成 900。
 *   - island 只改 textContent，不碰 class（外层的 text-5xl 等由模板给）
 *
 * ---- 3. hero-terminal（HeroTerminal.tsx） -------------------------
 *
 *   <div data-fx="hero-terminal"
 *        class="min-h-[4.5rem] font-mono text-[13px] leading-6 text-fg3 sm:min-h-[4.5rem]"
 *        aria-label="cargo 启动序列">
 *     <p data-fx-cmd class="text-fg2">$ cargo run --release --jd 2026</p>
 *     <p data-fx-line>   Compiling rust-dojo v0.1.0</p>
 *     <p data-fx-line class="text-ok">    Finished `release` in 0.8s — 开始训练</p>
 *   </div>
 *
 *   - [data-fx-cmd]   命令行那一行。**要打的字就是它的 textContent**，模板不得在标签
 *                     和文本之间塞换行/缩进（React 渲染的是紧贴的 {typed}）。
 *   - [data-fx-line]  日志行，顺序即出现顺序，模板渲染终态（全部可见、不带 hidden）。
 *                     island 播放时用 hidden 属性逐行放出，等价于 React 的
 *                     LINES.slice(0, lineCount)。
 *   - 光标 <span class="fx-caret ml-0.5" aria-hidden="true"> 由 island 动态创建/移除，
 *     模板不要写（SSR 终态 done=true 本来就没有光标）。
 *
 * ---- 4. magnetic（Magnetic.tsx） ----------------------------------
 *
 *   <span data-fx="magnetic" class="inline-block <原 className>">
 *     <span class="fx-magnet inline-block"><a class="fx-press …">…</a></span>
 *   </span>
 *
 *   - 外层挂 data-fx="magnetic" 并接管指针事件；内层必须是 .fx-magnet（被位移的那个）
 *   - 仅精确指针（pointerType==='mouse'）生效，触屏不动；reduced-motion 不动
 *
 * ---- 5. marquee（Marquee.tsx） ------------------------------------
 *
 *   <div data-fx="marquee" class="fx-marquee border-y border-line py-3 <原 className>">
 *     <div class="fx-marquee-track">
 *       <span aria-hidden="false" class="inline-flex items-center">…items…</span>
 *       <span aria-hidden="true"  class="inline-flex items-center">…items…</span>
 *     </div>
 *   </div>
 *
 *   - 位移动画是纯 CSS（fx-marquee 36s linear infinite，位移 -50%），**不需要 JS**。
 *     模板照 Marquee.tsx 输出两份行内容即可（SSR 与 Next 基线逐节点一致）。
 *   - island 只做兜底：track 里只有一份行时，克隆一份并标 aria-hidden="true"，
 *     免得 -50% 位移把内容拉空。已经是两份就原样不动（幂等）。
 *
 * ---- 6. module-ladder（ModuleLadder.tsx） -------------------------
 *
 *   <div data-fx="module-ladder" class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.5fr)_minmax(0,1.5fr)]">
 *     <div class="hidden lg:block">
 *       <div class="sticky top-28 border-t-2 border-brand pt-6">
 *         <p class="font-mono text-6xl font-black leading-none text-fg tabular-nums"><span
 *           data-fx-ladder-index>01</span><span class="text-2xl text-fg3"> / 08</span></p>
 *         <p data-fx-ladder-tier class="mt-5 font-mono text-[11px] uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-400">入门</p>
 *         <p data-fx-ladder-summary class="mt-4 min-h-[6rem] max-w-xs text-sm leading-7 text-fg2">…</p>
 *         <div class="mt-6 h-px w-full bg-line">
 *           <div data-fx-ladder-bar class="h-px bg-emerald-600 transition-all duration-500" style="width: 12.5%"></div>
 *         </div>
 *       </div>
 *     </div>
 *     <ol data-fx-ladder-rows class="border-t border-line">
 *       <li class="fx-ladder-row border-b border-line"
 *           data-active="true"
 *           data-fx-tier="入门"
 *           data-fx-tier-class="text-emerald-700 dark:text-emerald-400"
 *           data-fx-bar-class="bg-emerald-600"
 *           data-fx-summary="…">…（Link 结构照搬 ModuleLadder.tsx）…</li>
 *       …
 *     </ol>
 *   </div>
 *
 *   - [data-fx-ladder-rows]  行容器（React 里就是那个 <ol>，IO 观察的也是它）。
 *                            行 = 它的直接子元素，顺序即索引。
 *   - 每个行元素带 fx-ladder-row 类和 data-active（"true"/"false"，模板按 active=0 渲染），
 *     island 只改 data-active。
 *   - data-fx-tier / data-fx-tier-class / data-fx-bar-class / data-fx-summary：
 *     sticky 面板要用的、只存在于 React 侧 state 的四份数据，模板把它们放在行上。
 *     tier-class = TIER_COLORS[tierKey].text（无 tierKey 时 'text-brand'），
 *     bar-class  = TIER_COLORS[tierKey].bar （无 tierKey 时 'bg-brand'），
 *     与 ModuleLadder.tsx 的 `currentColor?.text ?? 'text-brand'` 完全同源。
 *     两个 class 串必须是完整静态类名（模板里禁止拼接），Tailwind CLI 扫模板时能收到。
 *   - [data-fx-ladder-index]  两位序号，island 写 String(active+1).padStart(2,'0')
 *   - [data-fx-ladder-tier]   层级文案节点，island 写文案并换 tier-class
 *   - [data-fx-ladder-summary] 摘要节点，island 只改 textContent
 *   - [data-fx-ladder-bar]    进度条，island 写 style.width = ((active+1)/rows.length)*100 + '%'
 *                             并换 bar-class
 *   - 桌面端 sticky 面板整块 hidden lg:block，移动端不显示；行的明暗对比由
 *     CSS 的 .fx-ladder-row[data-active] 负责，island 不写 opacity。
 */

/** prefers-reduced-motion 探测；无 matchMedia 环境（jsdom/老浏览器）按未开启处理。 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** 空清理函数：让每个 mount* 的返回类型统一，调用方不用判空。 */
const NOOP = (): void => {};

function els(root: ParentNode, fx: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-fx="${fx}"]`));
}

/** 整串类名换掉（`dark:text-emerald-400` 这种带冒号的 token 也能进 classList）。 */
function swapClasses(el: HTMLElement, prev: string, next: string): void {
  if (prev === next) return;
  for (const c of prev.split(/\s+/).filter(Boolean)) el.classList.remove(c);
  for (const c of next.split(/\s+/).filter(Boolean)) el.classList.add(c);
}

/* ------------------------------------------------------------------ */
/* 1. Reveal                                                           */
/* ------------------------------------------------------------------ */

const REVEAL_OPTIONS: IntersectionObserverInit = {
  rootMargin: '0px 0px -12% 0px',
  threshold: 0.05,
};

export function mountReveal(root: ParentNode = document): () => void {
  const targets = els(root, 'reveal');
  if (targets.length === 0) return NOOP;

  for (const el of targets) {
    // 与 Reveal.tsx 对齐：delay 缺省是 0，且**总是**写进内联 style。
    // 只在有 data-fx-delay 时才写的话，祖先上的非零 --fx-delay 会被继承下来，
    // 变成没人要求过的延迟。
    const delay = Number(el.getAttribute('data-fx-delay') ?? 0) || 0;
    el.style.setProperty('--fx-delay', `${delay}ms`);
  }

  if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
    for (const el of targets) el.classList.add('is-in');
    return NOOP;
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }
  }, REVEAL_OPTIONS);

  for (const el of targets) io.observe(el);
  return () => io.disconnect();
}

/* ------------------------------------------------------------------ */
/* 2. CountUp                                                          */
/* ------------------------------------------------------------------ */

/** CountUp.tsx 的 `duration = 900` 默认值。 */
const COUNT_UP_DURATION = 900;
/** CountUp.tsx 的 IntersectionObserver { threshold: 0.4 }。 */
const COUNT_UP_THRESHOLD = 0.4;

export function mountCountUp(root: ParentNode = document): () => void {
  const targets = els(root, 'count-up');
  if (targets.length === 0) return NOOP;

  // 照 CountUp.tsx：reduced-motion 或没有 IO 时**什么都不做**，
  // 元素保持 SSR 的终值文本。
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return NOOP;

  const observers: IntersectionObserver[] = [];
  const cancels: Array<() => void> = [];

  for (const el of targets) {
    const value = Number(el.getAttribute('data-fx-value') ?? 0) || 0;
    const suffix = el.getAttribute('data-fx-suffix') ?? '';
    // 只有「属性缺失 / 空串 / 非有限数」才回落默认值。不能写成 `|| COUNT_UP_DURATION`：
    // 那样显式的 0 会被悄悄改成 900，而 React 侧 duration={0} 是「下一帧直达终值」。
    const durationAttr = el.getAttribute('data-fx-duration');
    const parsedDuration = durationAttr === null || durationAttr.trim() === '' ? NaN : Number(durationAttr);
    const duration = Number.isFinite(parsedDuration) ? parsedDuration : COUNT_UP_DURATION;
    let started = false;
    let rafId = 0;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || started) return;
        started = true;
        io.disconnect();
        el.textContent = `0${suffix}`;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = `${Math.round(value * eased)}${suffix}`;
          rafId = p < 1 ? requestAnimationFrame(tick) : 0;
        };
        rafId = requestAnimationFrame(tick);
      },
      { threshold: COUNT_UP_THRESHOLD },
    );
    io.observe(el);
    observers.push(io);
    // 卸载时排队中的那一帧必须撤掉，否则它还会往已经不归本 island 管的 DOM 里写数字。
    cancels.push(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    });
  }

  return () => {
    for (const io of observers) io.disconnect();
    for (const cancel of cancels) cancel();
  };
}

/* ------------------------------------------------------------------ */
/* 3. HeroTerminal                                                     */
/* ------------------------------------------------------------------ */

/** HeroTerminal.tsx 的 sessionStorage 键：本会话只播一次 boot 序列。 */
const BOOT_KEY = 'rustdojo:boot';
/** 起手延迟 window.setTimeout(type, 250)。 */
const BOOT_START_DELAY = 250;
/** 每个字符 window.setTimeout(type, 26)。 */
const BOOT_TYPE_INTERVAL = 26;
/** 打完命令后第一行日志 180ms、第二行 420ms、收光标 900ms。 */
const BOOT_LINE1_DELAY = 180;
const BOOT_LINE2_DELAY = 420;
const BOOT_DONE_DELAY = 900;

export function mountHeroTerminal(root: ParentNode = document): () => void {
  const targets = els(root, 'hero-terminal');
  if (targets.length === 0) return NOOP;

  const cleanups: Array<() => void> = [];

  for (const el of targets) {
    const cmdEl = el.querySelector<HTMLElement>('[data-fx-cmd]');
    if (!cmdEl) continue;
    const lineEls = Array.from(el.querySelectorAll<HTMLElement>('[data-fx-line]'));
    const cmd = cmdEl.textContent ?? '';

    // HeroTerminal.tsx 里 sessionStorage 没包 try/catch：隐私模式下 getItem 或 setItem
    // 任意一个抛，effect 都会当场中断 —— 动画根本不会开始、DOM 停在 SSR 终态。
    // island 这边把「读失败」当作 seen=已看过、「写失败」当作直接放弃本次播放，
    // 两条路径的可观察行为都与 React 完全一致（决不能吞掉异常继续播）。
    let seen: string | null = '1';
    try {
      seen = sessionStorage.getItem(BOOT_KEY);
    } catch {
      seen = '1';
    }
    if (prefersReducedMotion() || seen) continue;
    try {
      sessionStorage.setItem(BOOT_KEY, '1');
    } catch {
      continue;
    }

    const caret = document.createElement('span');
    caret.className = 'fx-caret ml-0.5';
    caret.setAttribute('aria-hidden', 'true');

    let typed = '';
    let lineCount = 0;
    let done = false;
    let alive = true;
    let i = 0;
    const timers: number[] = [];

    const render = () => {
      cmdEl.textContent = typed;
      if (!done) cmdEl.appendChild(caret);
      lineEls.forEach((line, index) => {
        if (index < lineCount) line.removeAttribute('hidden');
        else line.setAttribute('hidden', '');
      });
    };

    // 对应 React 的 setTyped('') / setLineCount(0) / setDone(false)
    render();

    const type = () => {
      if (!alive) return;
      i += 1;
      typed = cmd.slice(0, i);
      render();
      if (i < cmd.length) {
        timers.push(window.setTimeout(type, BOOT_TYPE_INTERVAL));
      } else {
        timers.push(
          window.setTimeout(() => {
            if (!alive) return;
            lineCount = 1;
            render();
          }, BOOT_LINE1_DELAY),
        );
        timers.push(
          window.setTimeout(() => {
            if (!alive) return;
            lineCount = 2;
            render();
          }, BOOT_LINE2_DELAY),
        );
        timers.push(
          window.setTimeout(() => {
            if (!alive) return;
            done = true;
            render();
          }, BOOT_DONE_DELAY),
        );
      }
    };
    timers.push(window.setTimeout(type, BOOT_START_DELAY));

    cleanups.push(() => {
      // React 的 cleanup 只翻 alive；这里额外 clearTimeout，行为等价（alive 已经拦住了），
      // 但不会把定时器漏到下一个测试用例里。
      alive = false;
      for (const id of timers) window.clearTimeout(id);
    });
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}

/* ------------------------------------------------------------------ */
/* 4. Magnetic                                                         */
/* ------------------------------------------------------------------ */

/** Magnetic.tsx 的位移系数：x 走 (dx/宽)*10px，y 走 (dy/高)*8px。 */
const MAGNET_X_RANGE = 10;
const MAGNET_Y_RANGE = 8;

export function mountMagnetic(root: ParentNode = document): () => void {
  const targets = els(root, 'magnetic');
  if (targets.length === 0) return NOOP;

  const cleanups: Array<() => void> = [];

  for (const outer of targets) {
    const inner = outer.querySelector<HTMLElement>('.fx-magnet');
    if (!inner) continue;

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (prefersReducedMotion()) return;
      const rect = inner.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      inner.style.transform = `translate(${(dx / rect.width) * MAGNET_X_RANGE}px, ${(dy / rect.height) * MAGNET_Y_RANGE}px)`;
    };
    const reset = () => {
      inner.style.transform = '';
    };

    outer.addEventListener('pointermove', move);
    outer.addEventListener('pointerleave', reset);
    cleanups.push(() => {
      outer.removeEventListener('pointermove', move);
      outer.removeEventListener('pointerleave', reset);
    });
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}

/* ------------------------------------------------------------------ */
/* 5. Marquee                                                          */
/* ------------------------------------------------------------------ */

export function mountMarquee(root: ParentNode = document): () => void {
  for (const el of els(root, 'marquee')) {
    const track = el.querySelector<HTMLElement>('.fx-marquee-track');
    if (!track) continue;
    // Marquee.tsx 是服务端组件：两份 row 由模板直接输出，位移动画纯 CSS。
    // 只有模板只给了一份时才补第二份（aria-hidden），保证 -50% 位移是无缝的。
    if (track.children.length !== 1) continue;
    const clone = track.children[0].cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  }
  return NOOP;
}

/* ------------------------------------------------------------------ */
/* 6. ModuleLadder                                                     */
/* ------------------------------------------------------------------ */

export function mountModuleLadder(root: ParentNode = document): () => void {
  const targets = els(root, 'module-ladder');
  if (targets.length === 0) return NOOP;
  // ModuleLadder.tsx 没有 reduced-motion 分支（行对比度由 CSS media query 处理），
  // 这里同样不加。
  if (typeof IntersectionObserver === 'undefined') return NOOP;

  const cleanups: Array<() => void> = [];

  for (const container of targets) {
    const list = container.querySelector<HTMLElement>('[data-fx-ladder-rows]');
    if (!list) continue;
    const rows = Array.from(list.children) as HTMLElement[];
    if (rows.length === 0) continue;

    const indexEl = container.querySelector<HTMLElement>('[data-fx-ladder-index]');
    const tierEl = container.querySelector<HTMLElement>('[data-fx-ladder-tier]');
    const summaryEl = container.querySelector<HTMLElement>('[data-fx-ladder-summary]');
    const barEl = container.querySelector<HTMLElement>('[data-fx-ladder-bar]');

    const tierClassOf = (row: HTMLElement) => row.getAttribute('data-fx-tier-class') ?? '';
    const barClassOf = (row: HTMLElement) => row.getAttribute('data-fx-bar-class') ?? '';

    // 模板按 active=0 渲染，island 从同一个起点接手。
    let active = 0;
    let tierClass = tierClassOf(rows[0]);
    let barClass = barClassOf(rows[0]);

    const paint = () => {
      const current = rows[active] ?? rows[0];
      rows.forEach((row, index) => {
        row.setAttribute('data-active', String(index === active));
      });
      if (indexEl) indexEl.textContent = String(active + 1).padStart(2, '0');
      if (tierEl) {
        tierEl.textContent = current.getAttribute('data-fx-tier') ?? '';
        const next = tierClassOf(current);
        swapClasses(tierEl, tierClass, next);
        tierClass = next;
      }
      if (summaryEl) summaryEl.textContent = current.getAttribute('data-fx-summary') ?? '';
      if (barEl) {
        barEl.style.width = `${((active + 1) / rows.length) * 100}%`;
        const next = barClassOf(current);
        swapClasses(barEl, barClass, next);
        barClass = next;
      }
    };

    // IO 只做「该重算了」的信号；激活行 = 距视口中心最近的行
    const recompute = () => {
      const center = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      rows.forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        const dist = Math.abs((rect.top + rect.bottom) / 2 - center);
        if (dist < bestDist) {
          bestDist = dist;
          best = idx;
        }
      });
      if (best === active) return; // 等价于 React setActive 同值不重渲染
      active = best;
      paint();
    };

    let ticking = false;
    let scrollRaf = 0;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        recompute();
        ticking = false;
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          window.addEventListener('scroll', onScroll, { passive: true });
          recompute();
        } else {
          window.removeEventListener('scroll', onScroll);
        }
      },
      { threshold: 0 },
    );
    io.observe(list);

    cleanups.push(() => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      // 摘监听只挡住新的滚动；已经排在队里的那一帧还是会跑 recompute() 写 data-active。
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      scrollRaf = 0;
    });
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}

/* ------------------------------------------------------------------ */

/** 挂载全部六个动效；返回统一的卸载函数（测试用，页面上不需要卸载）。 */
export function mountFx(root: ParentNode = document): () => void {
  const cleanups = [
    mountReveal(root),
    mountCountUp(root),
    mountHeroTerminal(root),
    mountMagnetic(root),
    mountMarquee(root),
    mountModuleLadder(root),
  ];
  return () => {
    for (const fn of cleanups) fn();
  };
}

mountFx();
