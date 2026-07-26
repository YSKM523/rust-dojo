'use client';

import { useRef, type ReactNode } from 'react';
import { prefersReducedMotion } from './reducedMotion';

/** 磁性容器：指针靠近时子元素向指针轻微偏移（最多 5px），离开回弹。仅精确指针设备。 */
export function Magnetic({ children, className = '' }: { children: ReactNode; className?: string }) {
  const inner = useRef<HTMLSpanElement | null>(null);

  const move = (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = inner.current;
    if (!el || e.pointerType !== 'mouse') return;
    if (prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${(dx / rect.width) * 10}px, ${(dy / rect.height) * 8}px)`;
  };

  const reset = () => {
    if (inner.current) inner.current.style.transform = '';
  };

  return (
    <span className={`inline-block ${className}`} onPointerMove={move} onPointerLeave={reset}>
      <span ref={inner} className="fx-magnet inline-block">
        {children}
      </span>
    </span>
  );
}
