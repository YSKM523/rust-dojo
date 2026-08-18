/**
 * fx island — 「编译器的仪式感」动效
 *
 * 本批（Task 2）只含 Reveal；HeroTerminal / ModuleLadder / Marquee / CountUp /
 * Magnetic 由 Task 8 补齐到同一个文件、同一套 data-fx 协议。
 * CSS 语法（.fx-reveal / .is-in / --fx-delay）在 islands/site.css 的 fx layer，
 * 与 app/globals.css 逐字一致，本文件只负责加 .is-in。
 *
 * 语义事实源：
 *   - components/fx/Reveal.tsx        IntersectionObserver 参数逐项照搬：
 *                                     rootMargin '0px 0px -12% 0px'、threshold 0.05、
 *                                     命中一次即 add('is-in') 并停止观察；
 *                                     无 IntersectionObserver 的环境直接 add('is-in')
 *   - components/fx/reducedMotion.ts  prefersReducedMotion() 原样内联（三行，不跨目录
 *                                     import components/，避免 B4 删 components/ 时断链）
 *
 * 挂载协议（模板按此写 DOM）：
 *
 *   <div class="fx-reveal <原 className>" data-fx="reveal" data-fx-delay="90">…</div>
 *
 *   - 选择器：[data-fx="reveal"]
 *   - class 必须自带 fx-reveal（无 JS 时 CSS 保证可见；html.fx-js 下才隐藏待揭示）
 *   - data-fx-delay  可选，级联延迟毫秒数，对应 Reveal 的 delay prop。
 *                    模板也可以直接写 style="--fx-delay: 90ms"，两种都行；
 *                    本 island 见到 data-fx-delay 就写 --fx-delay，缺省不动。
 *   - reduced motion 下立即 add('is-in')（CSS 侧本就把动画全禁掉，等价于直接可见）
 */

/** prefers-reduced-motion 探测；无 matchMedia 环境（jsdom/老浏览器）按未开启处理。 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const REVEAL_OPTIONS: IntersectionObserverInit = {
  rootMargin: '0px 0px -12% 0px',
  threshold: 0.05,
};

export function mountReveal(root: ParentNode = document): void {
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-fx="reveal"]'));
  if (els.length === 0) return;

  for (const el of els) {
    const delay = el.getAttribute('data-fx-delay');
    if (delay !== null) el.style.setProperty('--fx-delay', `${Number(delay) || 0}ms`);
  }

  if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
    for (const el of els) el.classList.add('is-in');
    return;
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }
  }, REVEAL_OPTIONS);

  for (const el of els) io.observe(el);
}

mountReveal();
