// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mountCountUp,
  mountHeroTerminal,
  mountMagnetic,
  mountMarquee,
  mountModuleLadder,
  mountReveal,
} from './fx';

/* ------------------------------------------------------------------ */
/* jsdom 没有 IntersectionObserver：装一个能手动触发的替身                */
/* ------------------------------------------------------------------ */

type Trigger = (isIntersecting: boolean) => void;

const triggers: Trigger[] = [];
const instances: FakeIntersectionObserver[] = [];

class FakeIntersectionObserver {
  readonly targets: Element[] = [];
  disconnected = false;
  constructor(
    private cb: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    instances.push(this);
    triggers.push((isIntersecting) => {
      if (this.disconnected) return;
      this.cb(
        this.targets.map((target) => ({ target, isIntersecting })) as unknown as IntersectionObserverEntry[],
        this as unknown as IntersectionObserver,
      );
    });
  }
  observe(el: Element) {
    this.targets.push(el);
  }
  unobserve(el: Element) {
    const i = this.targets.indexOf(el);
    if (i >= 0) this.targets.splice(i, 1);
  }
  disconnect() {
    this.disconnected = true;
    this.targets.length = 0;
  }
  takeRecords() {
    return [];
  }
}

/** 触发所有活着的 observer。 */
function intersect(isIntersecting = true) {
  for (const t of [...triggers]) t(isIntersecting);
}

/** 强制 reduced-motion 开/关（fx.ts 的 prefersReducedMotion 走 matchMedia）。 */
function setReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

function rect(top: number, height: number): DOMRect {
  return { top, bottom: top + height, left: 0, right: 0, width: 0, height, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
}

beforeEach(() => {
  document.body.innerHTML = '';
  triggers.length = 0;
  instances.length = 0;
  sessionStorage.clear();
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  setReducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */
/* CountUp                                                             */
/* ------------------------------------------------------------------ */

describe('count-up', () => {
  /** 手动排空的 rAF 队列 + 可控的 performance.now，用来一帧帧检查数值推进。 */
  function takeOverRaf() {
    const queue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queue.push(cb));
    return (t: number) => {
      const pending = queue.splice(0, queue.length);
      for (const cb of pending) cb(t);
    };
  }

  it('进入视口后按 ease-out cubic 推进到终值', () => {
    const flush = takeOverRaf();
    vi.spyOn(performance, 'now').mockReturnValue(0);
    document.body.innerHTML =
      '<span data-fx="count-up" data-fx-value="60" data-fx-suffix="+" data-fx-duration="900">60+</span>';
    const el = document.querySelector('span')!;

    const unmount = mountCountUp(document);
    expect(el).toHaveTextContent('60+'); // 还没进视口，保持 SSR 终值

    intersect(true);
    expect(el.textContent).toBe('0+'); // 命中即归零

    // p = 0.5 → eased = 1 - 0.5^3 = 0.875 → round(60 * 0.875) = 53
    flush(450);
    expect(el.textContent).toBe('53+');

    // p = 1 → eased = 1 → 60
    flush(900);
    expect(el.textContent).toBe('60+');

    // p 已到 1，不再排新帧
    flush(1200);
    expect(el.textContent).toBe('60+');
    unmount();
  });

  it('observer 用 CountUp.tsx 的 threshold 0.4；duration 缺省 900', () => {
    const flush = takeOverRaf();
    vi.spyOn(performance, 'now').mockReturnValue(0);
    document.body.innerHTML = '<span data-fx="count-up" data-fx-value="8">8</span>';
    const unmount = mountCountUp(document);

    expect(instances).toHaveLength(1);
    expect(instances[0].options).toEqual({ threshold: 0.4 });

    intersect(true);
    // 缺省 duration = 900：t=900 时必须已经到终值
    flush(900);
    expect(document.querySelector('span')!.textContent).toBe('8');
    unmount();
  });

  it('reduced-motion 下直接停在终值，不建 observer', () => {
    setReducedMotion(true);
    document.body.innerHTML = '<span data-fx="count-up" data-fx-value="60" data-fx-suffix="+">60+</span>';
    const el = document.querySelector('span')!;

    const unmount = mountCountUp(document);
    expect(triggers).toHaveLength(0);

    intersect(true);
    expect(el.textContent).toBe('60+');
    unmount();
  });

  it('没有 IntersectionObserver 的环境同样停在终值', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    document.body.innerHTML = '<span data-fx="count-up" data-fx-value="4">4</span>';
    const unmount = mountCountUp(document);
    expect(document.querySelector('span')!.textContent).toBe('4');
    unmount();
  });
});

/* ------------------------------------------------------------------ */
/* HeroTerminal                                                        */
/* ------------------------------------------------------------------ */

const CMD = '$ cargo run --release --jd 2026';

function heroDom() {
  document.body.innerHTML =
    `<div data-fx="hero-terminal" aria-label="cargo 启动序列">` +
    `<p data-fx-cmd class="text-fg2">${CMD}</p>` +
    `<p data-fx-line>   Compiling rust-dojo v0.1.0</p>` +
    `<p data-fx-line class="text-ok">    Finished \`release\` in 0.8s — 开始训练</p>` +
    `</div>`;
  return {
    cmd: document.querySelector<HTMLElement>('[data-fx-cmd]')!,
    lines: Array.from(document.querySelectorAll<HTMLElement>('[data-fx-line]')),
  };
}

describe('hero-terminal', () => {
  it('挂载后清空命令行、挂上光标并隐藏日志行，再逐字打字', () => {
    vi.useFakeTimers();
    const { cmd, lines } = heroDom();

    const unmount = mountHeroTerminal(document);

    // 对应 setTyped('') / setLineCount(0) / setDone(false)
    expect(cmd.textContent).toBe('');
    expect(cmd.querySelector('.fx-caret')).not.toBeNull();
    expect(cmd.querySelector('.fx-caret')).toHaveAttribute('aria-hidden', 'true');
    for (const line of lines) expect(line).toHaveAttribute('hidden');

    vi.advanceTimersByTime(250); // 起手延迟
    expect(cmd.textContent).toBe('$');

    vi.advanceTimersByTime(26 * 3); // 每字符 26ms
    expect(cmd.textContent).toBe(CMD.slice(0, 4));

    vi.advanceTimersByTime(26 * CMD.length); // 打完
    expect(cmd.textContent).toBe(CMD);
    expect(lines[0]).toHaveAttribute('hidden');

    vi.advanceTimersByTime(180); // 第一行日志
    expect(lines[0]).not.toHaveAttribute('hidden');
    expect(lines[1]).toHaveAttribute('hidden');

    vi.advanceTimersByTime(420 - 180); // 第二行日志
    expect(lines[1]).not.toHaveAttribute('hidden');
    expect(cmd.querySelector('.fx-caret')).not.toBeNull();

    vi.advanceTimersByTime(900 - 420); // 收笔，光标消失
    expect(cmd.querySelector('.fx-caret')).toBeNull();
    expect(cmd.textContent).toBe(CMD);
    unmount();
  });

  it('本会话已播过（sessionStorage rustdojo:boot）就保持终态', () => {
    vi.useFakeTimers();
    sessionStorage.setItem('rustdojo:boot', '1');
    const { cmd, lines } = heroDom();

    const unmount = mountHeroTerminal(document);
    expect(cmd.textContent).toBe(CMD);
    expect(cmd.querySelector('.fx-caret')).toBeNull();
    for (const line of lines) expect(line).not.toHaveAttribute('hidden');
    unmount();
  });

  it('reduced-motion 下保持终态且不写 sessionStorage', () => {
    setReducedMotion(true);
    const { cmd } = heroDom();

    const unmount = mountHeroTerminal(document);
    expect(cmd.textContent).toBe(CMD);
    expect(sessionStorage.getItem('rustdojo:boot')).toBeNull();
    unmount();
  });
});

/* ------------------------------------------------------------------ */
/* Marquee                                                             */
/* ------------------------------------------------------------------ */

describe('marquee', () => {
  it('模板只给一份行内容时补一份 aria-hidden 副本', () => {
    document.body.innerHTML =
      '<div data-fx="marquee" class="fx-marquee"><div class="fx-marquee-track">' +
      '<span aria-hidden="false" class="inline-flex items-center">TOKIO</span>' +
      '</div></div>';
    const track = document.querySelector<HTMLElement>('.fx-marquee-track')!;

    expect(() => mountMarquee(document)).not.toThrow();

    expect(track.children).toHaveLength(2);
    expect(track.children[1]).toHaveAttribute('aria-hidden', 'true');
    expect(track.children[1].textContent).toBe('TOKIO');
  });

  it('模板已给两份就原样不动（幂等）', () => {
    document.body.innerHTML =
      '<div data-fx="marquee" class="fx-marquee"><div class="fx-marquee-track">' +
      '<span aria-hidden="false">A</span><span aria-hidden="true">A</span>' +
      '</div></div>';
    const track = document.querySelector<HTMLElement>('.fx-marquee-track')!;

    mountMarquee(document);
    mountMarquee(document);

    expect(track.children).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/* Reveal                                                              */
/* ------------------------------------------------------------------ */

describe('reveal', () => {
  it('进入视口加 is-in，并把 data-fx-delay 写成 --fx-delay', () => {
    document.body.innerHTML =
      '<div class="fx-reveal" data-fx="reveal" data-fx-delay="90"></div><div class="fx-reveal" data-fx="reveal"></div>';
    const [a, b] = Array.from(document.querySelectorAll<HTMLElement>('.fx-reveal'));

    const unmount = mountReveal(document);
    expect(a.style.getPropertyValue('--fx-delay')).toBe('90ms');
    expect(b.style.getPropertyValue('--fx-delay')).toBe('0ms');
    expect(a.classList.contains('is-in')).toBe(false);

    intersect(true);
    expect(a.classList.contains('is-in')).toBe(true);
    expect(b.classList.contains('is-in')).toBe(true);
    unmount();
  });

  it('reduced-motion 下直接可见', () => {
    setReducedMotion(true);
    document.body.innerHTML = '<div class="fx-reveal" data-fx="reveal"></div>';
    mountReveal(document);
    expect(document.querySelector('.fx-reveal')!.classList.contains('is-in')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Magnetic                                                            */
/* ------------------------------------------------------------------ */

function pointerEvent(type: string, init: MouseEventInit, pointerType: string) {
  const ev = new MouseEvent(type, { bubbles: true, ...init });
  Object.defineProperty(ev, 'pointerType', { value: pointerType });
  return ev;
}

describe('magnetic', () => {
  function magnetDom() {
    document.body.innerHTML =
      '<span data-fx="magnetic" class="inline-block"><span class="fx-magnet inline-block">开始学习</span></span>';
    const outer = document.querySelector<HTMLElement>('[data-fx="magnetic"]')!;
    const inner = document.querySelector<HTMLElement>('.fx-magnet')!;
    // 中心 (50, 20)，宽 100 高 40
    inner.getBoundingClientRect = () =>
      ({ top: 0, bottom: 40, left: 0, right: 100, width: 100, height: 40, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    return { outer, inner };
  }

  it('鼠标移动时按 (dx/w)*10 / (dy/h)*8 位移，离开回弹', () => {
    const { outer, inner } = magnetDom();
    const unmount = mountMagnetic(document);

    // dx = 100 - 50 = 50 → 50/100*10 = 5px；dy = 40 - 20 = 20 → 20/40*8 = 4px
    outer.dispatchEvent(pointerEvent('pointermove', { clientX: 100, clientY: 40 }, 'mouse'));
    expect(inner.style.transform).toBe('translate(5px, 4px)');

    outer.dispatchEvent(pointerEvent('pointerleave', {}, 'mouse'));
    expect(inner.style.transform).toBe('');
    unmount();
  });

  it('触摸指针不动', () => {
    const { outer, inner } = magnetDom();
    const unmount = mountMagnetic(document);
    outer.dispatchEvent(pointerEvent('pointermove', { clientX: 100, clientY: 40 }, 'touch'));
    expect(inner.style.transform).toBe('');
    unmount();
  });

  it('reduced-motion 不动', () => {
    setReducedMotion(true);
    const { outer, inner } = magnetDom();
    const unmount = mountMagnetic(document);
    outer.dispatchEvent(pointerEvent('pointermove', { clientX: 100, clientY: 40 }, 'mouse'));
    expect(inner.style.transform).toBe('');
    unmount();
  });
});

/* ------------------------------------------------------------------ */
/* ModuleLadder                                                        */
/* ------------------------------------------------------------------ */

describe('module-ladder', () => {
  function ladderDom() {
    document.body.innerHTML = `
      <div data-fx="module-ladder">
        <div class="hidden lg:block"><div class="sticky top-28">
          <p><span data-fx-ladder-index>01</span><span class="text-2xl text-fg3"> / 02</span></p>
          <p data-fx-ladder-tier class="mt-5 text-emerald-700 dark:text-emerald-400">入门</p>
          <p data-fx-ladder-summary class="mt-4">第一模块摘要</p>
          <div class="mt-6 h-px w-full bg-line">
            <div data-fx-ladder-bar class="h-px bg-emerald-600 transition-all duration-500" style="width: 50%"></div>
          </div>
        </div></div>
        <ol data-fx-ladder-rows>
          <li class="fx-ladder-row" data-active="true" data-fx-tier="入门"
              data-fx-tier-class="text-emerald-700 dark:text-emerald-400"
              data-fx-bar-class="bg-emerald-600" data-fx-summary="第一模块摘要"></li>
          <li class="fx-ladder-row" data-active="false" data-fx-tier="进阶"
              data-fx-tier-class="text-sky-700 dark:text-sky-400"
              data-fx-bar-class="bg-sky-600" data-fx-summary="第二模块摘要"></li>
        </ol>
      </div>`;
    return Array.from(document.querySelectorAll<HTMLElement>('.fx-ladder-row'));
  }

  it('激活距视口中心最近的行，并同步 sticky 面板的序号/层级/摘要/进度条', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const rows = ladderDom();
    // innerHeight 默认 768 → center 384；第二行中心 380 更近
    rows[0].getBoundingClientRect = () => rect(0, 100);
    rows[1].getBoundingClientRect = () => rect(330, 100);

    const unmount = mountModuleLadder(document);
    intersect(true); // IO 命中即 recompute

    expect(rows[0].getAttribute('data-active')).toBe('false');
    expect(rows[1].getAttribute('data-active')).toBe('true');
    expect(document.querySelector('[data-fx-ladder-index]')!.textContent).toBe('02');

    const tier = document.querySelector<HTMLElement>('[data-fx-ladder-tier]')!;
    expect(tier.textContent).toBe('进阶');
    expect(tier.className).toContain('text-sky-700');
    expect(tier.className).toContain('dark:text-sky-400');
    expect(tier.className).not.toContain('text-emerald-700');
    expect(tier.className).toContain('mt-5'); // 非 tier 类保持原样

    expect(document.querySelector('[data-fx-ladder-summary]')!.textContent).toBe('第二模块摘要');

    const bar = document.querySelector<HTMLElement>('[data-fx-ladder-bar]')!;
    expect(bar).toHaveStyle({ width: '100%' }); // (1+1)/2 * 100
    expect(bar.className).toContain('bg-sky-600');
    expect(bar.className).not.toContain('bg-emerald-600');
    expect(bar.className).toContain('transition-all');
    unmount();
  });

  it('滚动经 rAF 节流后重算激活行；卸载后不再响应', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    const rows = ladderDom();
    rows[0].getBoundingClientRect = () => rect(0, 100);
    rows[1].getBoundingClientRect = () => rect(2000, 100);

    const unmount = mountModuleLadder(document);
    intersect(true);
    expect(rows[0].getAttribute('data-active')).toBe('true');

    rows[1].getBoundingClientRect = () => rect(330, 100);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll')); // ticking 节流：只排一帧
    expect(frames).toHaveLength(1);
    frames.splice(0, frames.length).forEach((cb) => cb(0));
    expect(rows[1].getAttribute('data-active')).toBe('true');

    unmount();
    rows[0].getBoundingClientRect = () => rect(330, 100);
    rows[1].getBoundingClientRect = () => rect(2000, 100);
    window.dispatchEvent(new Event('scroll'));
    expect(frames).toHaveLength(0);
    expect(rows[1].getAttribute('data-active')).toBe('true');
  });

  it('IO 离开视口后摘掉 scroll 监听', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    const rows = ladderDom();
    rows[0].getBoundingClientRect = () => rect(0, 100);
    rows[1].getBoundingClientRect = () => rect(2000, 100);

    const unmount = mountModuleLadder(document);
    intersect(true);
    intersect(false);
    window.dispatchEvent(new Event('scroll'));
    expect(frames).toHaveLength(0);
    unmount();
  });
});
