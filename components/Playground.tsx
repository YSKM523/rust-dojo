'use client';

import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { AiCopilot } from './AiCopilot';
import { CodeEditor } from './CodeEditor';
import { RunOutput } from './RunOutput';
import { VerdictBanner } from './VerdictBanner';
import { judgeExercise } from '@/lib/rust/judge';
import { markCompleted } from '@/lib/progress/store';
import type { Exercise, JudgeResult } from '@/lib/rust/types';

export function Playground({ exercise }: { exercise: Exercise }) {
  const [code, setCode] = useState(exercise.starterCode);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const aiStatus = error || (result && !result.verdict.passed)
    ? 'failed'
    : result?.verdict.passed
      ? 'passed'
      : 'idle';

  async function run() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const nextResult = await judgeExercise(exercise, code);
      setResult(nextResult);
      if (nextResult.verdict.passed) markCompleted(exercise.id);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setRunning(false);
    }
  }

  function changeCode(nextCode: string) {
    setCode(nextCode);
    setResult(null);
    setError(null);
  }

  function reset() {
    setCode(exercise.starterCode);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden border border-line bg-panel shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              Rust Editor
            </p>
            <p className="mt-1 text-sm text-fg2">真实 rustc · Playground 判题</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={running}
              className="inline-flex items-center gap-2 rounded border border-line bg-panel2 px-3 py-2 text-sm font-bold text-fg transition hover:border-brand disabled:opacity-50"
            >
              <RotateCcw size={15} /> 重置
            </button>
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="fx-press inline-flex items-center gap-2 rounded bg-brand px-4 py-2 font-bold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={16} />
              {running ? '正在编译运行（Rust Playground）…' : '运行'}
            </button>
          </div>
        </div>
        <div className="p-3">
          <CodeEditor value={code} onChange={changeCode} />
        </div>
      </section>

      {exercise.hints && exercise.hints.length > 0 && (
        <details className="border border-line bg-panel px-4 py-3">
          <summary className="cursor-pointer font-semibold text-fg">提示</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-fg2">
            {exercise.hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ol>
        </details>
      )}

      {error && (
        <div role="alert" className="border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad">
          运行出错：{error}
        </div>
      )}
      {result && <VerdictBanner verdict={result.verdict} />}
      <RunOutput result={result} running={running} />
      <AiCopilot
        exerciseId={exercise.id}
        getCode={() => code}
        getError={() => result?.stderr || result?.verdict.reason || ''}
        status={aiStatus}
      />
    </div>
  );
}
