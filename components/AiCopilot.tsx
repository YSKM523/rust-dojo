'use client';
import { useState } from 'react';
import { Lightbulb, Search, Bug } from 'lucide-react';
import type { AiAction, AiStatus } from '@/lib/ai/prompts';

export function AiCopilot({
  exerciseId,
  getCode,
  getError,
  status = 'idle',
}: {
  exerciseId: string;
  getCode: () => string;
  getError: () => string | null;
  status?: AiStatus;
}) {
  const [loading, setLoading] = useState<AiAction | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(action: AiAction) {
    setLoading(action);
    setReply(null);
    setError(null);
    try {
      const resp = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          exerciseId,
          code: getCode(),
          errorMsg: status === 'passed' ? undefined : (getError() ?? undefined),
          status,
        }),
      });
      const data = (await resp.json()) as { reply?: string; error?: string };
      if (!resp.ok || data.error) setError(data.error ?? '出错了');
      else setReply(data.reply ?? '');
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(null);
    }
  }

  const btn =
    'inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-[#f4f0e8] transition disabled:opacity-50 hover:border-brand';
  const hintLabel = status === 'passed' ? '复盘本题' : '给点提示';
  return (
    <div className="border border-[#282b33] bg-[#111318] p-4 shadow-card">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand">
        AI 副驾（DeepSeek）
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => ask('hint')} disabled={!!loading} className={btn}>
          <Lightbulb size={15} /> {loading === 'hint' ? '思考中…' : hintLabel}
        </button>
        <button onClick={() => ask('explain')} disabled={!!loading} className={btn}>
          <Search size={15} /> {loading === 'explain' ? '思考中…' : '解释这段 Rust'}
        </button>
        {status === 'failed' && (
          <button onClick={() => ask('debug')} disabled={!!loading} className={btn}>
            <Bug size={15} /> {loading === 'debug' ? '思考中…' : '为什么报错'}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
      {reply && (
        <p className="mt-4 whitespace-pre-wrap border-t border-white/10 pt-4 text-sm leading-7 text-[#f4f0e8]">
          {reply}
        </p>
      )}
    </div>
  );
}
