'use client';

import type { Exercise } from '@/lib/rust/types';

export function Playground({ exercise }: { exercise: Exercise }) {
  return (
    <section className="space-y-4 border border-line bg-panel p-5 shadow-card">
      <div className="whitespace-pre-wrap leading-7 text-fg2">{exercise.prompt}</div>
      <button
        type="button"
        disabled
        className="rounded bg-brand px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        判题引擎接入中
      </button>
    </section>
  );
}
