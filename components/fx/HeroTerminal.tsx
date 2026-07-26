'use client';

import { useEffect, useState } from 'react';
import { prefersReducedMotion } from './reducedMotion';

const CMD = '$ cargo run --release --jd 2026';
const LINES = ['   Compiling rust-dojo v0.1.0', '    Finished `release` in 0.8s — 开始训练'];

/**
 * hero 终端 boot：打字输出 cargo 命令，再吐出两行编译日志。
 * SSR 渲染终态（无闪烁焦虑）；本会话第二次访问或 reduced-motion 直接显示终态。
 */
export function HeroTerminal() {
  const [typed, setTyped] = useState(CMD);
  const [lineCount, setLineCount] = useState(LINES.length);
  const [done, setDone] = useState(true);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const seen = sessionStorage.getItem('rustdojo:boot');
    if (reduced || seen) return;
    sessionStorage.setItem('rustdojo:boot', '1');

    let i = 0;
    let alive = true;
    setTyped('');
    setLineCount(0);
    setDone(false);

    const type = () => {
      if (!alive) return;
      i += 1;
      setTyped(CMD.slice(0, i));
      if (i < CMD.length) {
        window.setTimeout(type, 26);
      } else {
        window.setTimeout(() => alive && setLineCount(1), 180);
        window.setTimeout(() => alive && setLineCount(2), 420);
        window.setTimeout(() => alive && setDone(true), 900);
      }
    };
    window.setTimeout(type, 250);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      className="min-h-[4.5rem] font-mono text-[13px] leading-6 text-fg3 sm:min-h-[4.5rem]"
      aria-label="cargo 启动序列"
    >
      <p className="text-fg2">
        {typed}
        {!done && <span className="fx-caret ml-0.5" aria-hidden />}
      </p>
      {LINES.slice(0, lineCount).map((line) => (
        <p key={line} className={line.includes('Finished') ? 'text-ok' : undefined}>
          {line}
        </p>
      ))}
    </div>
  );
}
