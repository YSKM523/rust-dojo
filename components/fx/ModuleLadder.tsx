'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TierKey } from '@/lib/rust/types';
import { TIER_COLORS } from '@/lib/tier';

export interface LadderRow {
  id: string;
  title: string;
  summary: string;
  href: string;
  tier: string;
  tierKey?: TierKey;
}

/**
 * 签名动效：滚动驱动的模块阶梯（text ladder）。
 * 桌面端左侧 sticky 面板随激活行切换索引/层级/摘要，右侧行列表只有
 * 视口中带的那一行满墨，其余退为低对比。移动端退化为常规列表。
 */
export function ModuleLadder({ rows }: { rows: LadderRow[] }) {
  const [active, setActive] = useState(0);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    // IO 只做“该重算了”的信号；激活行 = 距视口中心最近的行
    const recompute = () => {
      const center = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      rowRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs((rect.top + rect.bottom) / 2 - center);
        if (dist < bestDist) {
          bestDist = dist;
          best = idx;
        }
      });
      setActive(best);
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        recompute();
        ticking = false;
      });
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          window.addEventListener('scroll', onScroll, { passive: true });
          recompute();
        } else if (!entries.some((entry) => entry.isIntersecting)) {
          window.removeEventListener('scroll', onScroll);
        }
      },
      { threshold: 0 },
    );
    const list = rowRefs.current[0]?.parentElement;
    if (list) io.observe(list);
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [rows.length]);

  const current = rows[active] ?? rows[0];
  const currentColor = current.tierKey ? TIER_COLORS[current.tierKey] : undefined;

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.5fr)_minmax(0,1.5fr)]">
      {/* sticky 面板：桌面端随激活行更新 */}
      <div className="hidden lg:block">
        <div className="sticky top-28 border-t-2 border-brand pt-6">
          <p className="font-mono text-6xl font-black leading-none text-fg tabular-nums">
            {String(active + 1).padStart(2, '0')}
            <span className="text-2xl text-fg3"> / {String(rows.length).padStart(2, '0')}</span>
          </p>
          <p
            className={`mt-5 font-mono text-[11px] uppercase tracking-[0.24em] ${currentColor?.text ?? 'text-brand'}`}
          >
            {current.tier}
          </p>
          <p className="mt-4 min-h-[6rem] max-w-xs text-sm leading-7 text-fg2">{current.summary}</p>
          <div className="mt-6 h-px w-full bg-line">
            <div
              className={`h-px ${currentColor?.bar ?? 'bg-brand'} transition-all duration-500`}
              style={{ width: `${((active + 1) / rows.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <ol className="border-t border-line">
        {rows.map((row, index) => (
          <li
            key={row.id}
            ref={(el) => {
              rowRefs.current[index] = el;
            }}
            data-active={index === active}
            className="fx-ladder-row border-b border-line"
          >
            <Link
              href={row.href}
              className="group grid grid-cols-[44px_1fr] items-baseline gap-x-4 py-6 sm:grid-cols-[64px_1fr_28px] sm:gap-x-6 lg:py-7"
            >
              <span
                className={`font-mono text-sm font-black sm:text-base ${row.tierKey ? TIER_COLORS[row.tierKey].text : 'text-brand'}`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-2xl font-black leading-tight tracking-tight text-fg transition-colors group-hover:text-brand sm:text-4xl lg:text-5xl">
                {row.title}
              </span>
              <ArrowRight
                size={20}
                className="hidden -translate-x-1.5 text-fg3 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-brand group-hover:opacity-100 sm:block"
              />
              <span className="col-start-2 mt-2 text-sm leading-6 text-fg2 lg:hidden">
                {row.summary}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
