'use client';
import { useState } from 'react';
import { EditorialPanel } from '@/components/EditorialPanel';

type Step = 'email' | 'code';

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function normalizeEmail() {
    return email.trim().toLowerCase();
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const normalizedEmail = normalizeEmail();
    if (!normalizedEmail) {
      setErr('请填写邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErr('请输入有效邮箱');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setErr(data.error ?? '发送失败');
        return;
      }
      setStep('code');
    } catch {
      setErr('网络错误，请重试');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const normalizedEmail = normalizeEmail();
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      setErr('请填写验证码');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, code: normalizedCode }),
      });
      const data = (await res.json()) as { user?: unknown; error?: string };
      if (!res.ok) {
        setErr(data.error ?? '验证失败');
        return;
      }
      window.location.assign('/me');
    } catch {
      setErr('网络错误，请重试');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full border border-line bg-panel2 px-4 py-3 text-fg placeholder:text-fg3';
  const primary =
    'w-full bg-brand px-4 py-3 font-bold text-white transition hover:bg-brand-hover disabled:opacity-50';

  return (
    <main className="w-full overflow-hidden bg-bg">
      <EditorialPanel className="bg-bg2" innerClassName="items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <header className="border-t border-line pt-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-brand">
              ACCOUNT SYNC
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-none text-fg sm:text-7xl">
              登录 Rust 道场
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-fg2">
              用邮箱验证码登录，进度自动跨设备同步。
            </p>
          </header>

          <section className="border border-line bg-panel shadow-card">
            <div className="border-b border-line p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">
                {step === 'email' ? 'EMAIL PASS' : 'VERIFY CODE'}
              </p>
              <p className="mt-2 text-sm text-fg2">
                {step === 'email' ? '输入邮箱，领取一次性验证码。' : '输入 6 位验证码继续。'}
              </p>
            </div>
            <div className="p-5">
              {step === 'email' ? (
                <form onSubmit={requestCode} className="space-y-4" noValidate>
                  <input
                    type="email"
                    required
                    aria-label="邮箱"
                    aria-invalid={!!err}
                    aria-describedby={err ? 'login-error' : undefined}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={input}
                  />
                  <button type="submit" disabled={busy} className={primary}>
                    {busy ? '发送中…' : '发送验证码'}
                  </button>
                </form>
              ) : (
                <form onSubmit={verify} className="space-y-4" noValidate>
                  <p className="text-sm text-fg2">
                    验证码已发往 <span className="text-fg">{email}</span>
                  </p>
                  <input
                    inputMode="numeric"
                    required
                    aria-label="验证码"
                    aria-invalid={!!err}
                    aria-describedby={err ? 'login-error' : undefined}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6 位验证码"
                    className={`${input} tracking-widest`}
                  />
                  <button type="submit" disabled={busy} className={primary}>
                    {busy ? '验证中…' : '登录'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setCode('');
                      setErr(null);
                    }}
                    className="w-full text-sm text-fg2 hover:text-fg"
                  >
                    换个邮箱
                  </button>
                </form>
              )}

              {err ? (
                <p id="login-error" role="alert" className="mt-4 text-sm text-bad">
                  {err}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </EditorialPanel>
    </main>
  );
}
