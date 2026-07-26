/** prefers-reduced-motion 探测；无 matchMedia 环境（jsdom/老浏览器）按未开启处理。 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
