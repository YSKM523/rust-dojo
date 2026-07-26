'use client';

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** 级联延迟（ms），映射到 --fx-delay */
  delay?: number;
  className?: string;
  as?: ElementType;
}

/** 滚动进入视口时触发一次 clip 揭示。语法定义在 globals.css 的 fx layer。 */
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('is-in');
            io.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`fx-reveal ${className}`}
      style={{ '--fx-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
