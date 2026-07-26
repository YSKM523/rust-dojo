'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './reducedMotion';

interface CountUpProps {
  /** 纯数字部分 */
  value: number;
  /** 数字后缀，如 "+" */
  suffix?: string;
  duration?: number;
  className?: string;
}

/** 进入视口时数字从 0 计数到目标值（ease-out），reduced-motion 直接显示终值。 */
export function CountUp({ value, suffix = '', duration = 900, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || started.current) return;
        started.current = true;
        io.disconnect();
        setDisplay(0);
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.round(value * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
