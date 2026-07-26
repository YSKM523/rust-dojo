'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Lightbulb } from 'lucide-react';
import type { ChecklistItem, ProjectDef } from '@/lib/rust/types';
import { useCompletedIds } from '@/lib/progress/useProgress';
import { markCompleted, unmarkCompleted } from '@/lib/progress/store';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // 无剪贴板权限（非 https / 老浏览器）时静默放弃，命令仍可手选复制
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`复制命令：${text}`}
      className="shrink-0 border border-line bg-panel px-2 py-1 text-xs font-bold text-fg2 transition hover:border-brand hover:text-brand"
    >
      {copied ? (
        <span className="flex items-center gap-1 text-ok">
          <Check size={12} /> 已复制
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Copy size={12} /> 复制
        </span>
      )}
    </button>
  );
}

function ChecklistRow({ item, done }: { item: ChecklistItem; done: boolean }) {
  const [showHint, setShowHint] = useState(false);

  return (
    <li className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <input
          id={`check-${item.id}`}
          type="checkbox"
          checked={done}
          onChange={(e) => {
            if (e.target.checked) markCompleted(item.id);
            else unmarkCompleted(item.id);
          }}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none border border-line bg-bg text-center font-bold leading-4 text-white after:block after:text-[11px] after:leading-4 checked:border-brand checked:bg-brand checked:after:content-['✓'] hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
        />
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`check-${item.id}`}
            className={`block cursor-pointer text-sm leading-6 ${done ? 'text-fg3 line-through' : 'text-fg'}`}
          >
            <span className="mr-2 font-mono text-xs text-fg3">{item.id}</span>
            {item.text}
          </label>

          {item.testCommand && (
            <div className="mt-2 flex items-start gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre border border-line bg-panel2 px-3 py-2 font-mono text-xs text-fg2">
                {item.testCommand}
              </code>
              <CopyButton text={item.testCommand} />
            </div>
          )}

          {item.hint && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                aria-expanded={showHint}
                className="flex items-center gap-1 text-xs font-bold text-link hover:underline"
              >
                <Lightbulb size={12} /> {showHint ? '收起提示' : '看提示'}
              </button>
              {showHint && (
                <p className="mt-2 border-l-2 border-brand bg-panel2 px-3 py-2 text-xs leading-6 text-fg2">
                  {item.hint}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function ProjectChecklist({ project }: { project: ProjectDef }) {
  const completed = new Set(useCompletedIds());
  const total = project.items.length;
  const done = project.items.filter((i) => completed.has(i.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  return (
    <section className="border border-line bg-panel p-5 shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fg3">Checklist</p>
          <h2 className="mt-2 text-xl font-black text-fg">验收清单</h2>
        </div>
        <p className="flex items-center gap-1 text-sm font-bold text-fg2">
          {done} / {total} 已验收
          {allDone && <Check size={14} className="text-ok" />}
        </p>
      </div>

      <div
        className="mt-4 h-1.5 w-full overflow-hidden bg-panel2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="验收进度"
      >
        <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-3 text-xs leading-5 text-fg3">
        在本地跑通每一条后自己勾选；进度与练习共用同一份记录，登录后会同步到云端。
      </p>

      <ul className="mt-4">
        {project.items.map((item) => (
          <ChecklistRow key={item.id} item={item} done={completed.has(item.id)} />
        ))}
      </ul>
    </section>
  );
}
