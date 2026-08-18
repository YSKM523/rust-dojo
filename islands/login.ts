/**
 * login island — 邮箱 OTP 两步登录
 *
 * 语义事实源：app/login/page.tsx（逐状态移植，无倒计时）。
 *   - 邮箱提交前 trim + lowercase；空值和格式错误使用原中文文案
 *   - POST /api/auth/request-code 成功后切换验证码表单
 *   - 验证码只做 trim + 非空校验，再 POST /api/auth/verify
 *   - API 非 2xx 优先原样显示 data.error；网络/JSON 异常显示原网络错误
 *   - 验证成功 window.location.assign('/me')
 *   - “换个邮箱”保留原始邮箱，清空验证码与错误
 *
 * 挂载协议（SSR 只输出 React 初始 email step，不预埋隐藏分支）：
 *   <section data-island="login">
 *     <p data-login-step-label>EMAIL PASS</p>
 *     <p data-login-step-description>输入邮箱，领取一次性验证码。</p>
 *     <div data-login-content>
 *       <form data-login-email-form>…</form>
 *     </div>
 *   </section>
 *
 * island 在 data-login-content 内逐状态替换当前表单；错误节点只在 err 非空时
 * 动态追加，并同步当前 input 的 aria-invalid / aria-describedby。所有用户文本都
 * 通过 value/textContent 写入，不作为 HTML 插值。
 */

export type LoginRequest = (input: string, init: RequestInit) => Promise<Response>;
export type LoginNavigate = (href: string) => void;

const INPUT_CLASS =
  'w-full border border-line bg-panel2 px-4 py-3 text-fg placeholder:text-fg3';
const PRIMARY_CLASS =
  'w-full bg-brand px-4 py-3 font-bold text-white transition hover:bg-brand-hover disabled:opacity-50';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginState {
  rawEmail: string;
  code: string;
  busy: boolean;
}

function content(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-login-content]');
}

function setStepCopy(root: HTMLElement, step: 'email' | 'code'): void {
  const label = root.querySelector<HTMLElement>('[data-login-step-label]');
  const description = root.querySelector<HTMLElement>('[data-login-step-description]');
  if (label) label.textContent = step === 'email' ? 'EMAIL PASS' : 'VERIFY CODE';
  if (description) {
    description.textContent =
      step === 'email' ? '输入邮箱，领取一次性验证码。' : '输入 6 位验证码继续。';
  }
}

function clearError(root: HTMLElement): void {
  root.querySelector('#login-error')?.remove();
  const input = root.querySelector<HTMLInputElement>('[data-login-email], [data-login-code]');
  input?.setAttribute('aria-invalid', 'false');
  input?.removeAttribute('aria-describedby');
}

function showError(root: HTMLElement, message: string): void {
  clearError(root);
  const input = root.querySelector<HTMLInputElement>('[data-login-email], [data-login-code]');
  input?.setAttribute('aria-invalid', 'true');
  input?.setAttribute('aria-describedby', 'login-error');

  const error = document.createElement('p');
  error.id = 'login-error';
  error.setAttribute('role', 'alert');
  error.className = 'mt-4 text-sm text-bad';
  error.textContent = message;
  content(root)?.append(error);
}

function renderEmailStep(root: HTMLElement, state: LoginState): void {
  setStepCopy(root, 'email');
  const host = content(root);
  if (!host) return;
  host.innerHTML = `
    <form class="space-y-4" novalidate data-login-email-form>
      <input type="email" required aria-label="邮箱" aria-invalid="false" value="" placeholder="you@example.com" class="${INPUT_CLASS}" data-login-email>
      <button type="submit" class="${PRIMARY_CLASS}" data-login-submit>发送验证码</button>
    </form>`;
  const input = host.querySelector<HTMLInputElement>('[data-login-email]');
  if (input) input.value = state.rawEmail;
  paintBusy(root, state);
}

function renderCodeStep(root: HTMLElement, state: LoginState): void {
  setStepCopy(root, 'code');
  const host = content(root);
  if (!host) return;
  host.innerHTML = `
    <form class="space-y-4" novalidate data-login-code-form>
      <p class="text-sm text-fg2">验证码已发往 <span class="text-fg" data-login-destination></span></p>
      <input inputmode="numeric" required aria-label="验证码" aria-invalid="false" value="" placeholder="6 位验证码" class="${INPUT_CLASS} tracking-widest" data-login-code>
      <button type="submit" class="${PRIMARY_CLASS}" data-login-submit>登录</button>
      <button type="button" class="w-full text-sm text-fg2 hover:text-fg" data-login-change-email>换个邮箱</button>
    </form>`;
  const destination = host.querySelector<HTMLElement>('[data-login-destination]');
  if (destination) destination.textContent = state.rawEmail;
  const input = host.querySelector<HTMLInputElement>('[data-login-code]');
  if (input) input.value = state.code;
  paintBusy(root, state);
}

function setBusy(button: HTMLButtonElement, busy: boolean, busyText: string, idleText: string): void {
  button.disabled = busy;
  button.textContent = busy ? busyText : idleText;
}

function paintBusy(root: HTMLElement, state: LoginState): void {
  const button = root.querySelector<HTMLButtonElement>('[data-login-submit]');
  if (!button) return;
  if (root.querySelector('[data-login-code-form]')) {
    setBusy(button, state.busy, '验证中…', '登录');
  } else {
    setBusy(button, state.busy, '发送中…', '发送验证码');
  }
}

async function requestCode(
  root: HTMLElement,
  state: LoginState,
  form: HTMLFormElement,
  request: LoginRequest,
  isAlive: () => boolean,
): Promise<void> {
  clearError(root);
  const input = form.querySelector<HTMLInputElement>('[data-login-email]');
  const button = form.querySelector<HTMLButtonElement>('[data-login-submit]');
  if (!input || !button || state.busy) return;

  state.rawEmail = input.value;
  const normalizedEmail = state.rawEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    showError(root, '请填写邮箱');
    return;
  }
  if (!EMAIL_RE.test(normalizedEmail)) {
    showError(root, '请输入有效邮箱');
    return;
  }

  state.busy = true;
  setBusy(button, true, '发送中…', '发送验证码');
  try {
    const res = await request('/api/auth/request-code', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!isAlive()) return;
    if (!res.ok) {
      showError(root, data.error ?? '发送失败');
      return;
    }
    state.code = '';
    renderCodeStep(root, state);
  } catch {
    if (isAlive()) showError(root, '网络错误，请重试');
  } finally {
    state.busy = false;
    if (isAlive()) paintBusy(root, state);
  }
}

async function verifyCode(
  root: HTMLElement,
  state: LoginState,
  form: HTMLFormElement,
  request: LoginRequest,
  navigate: LoginNavigate,
  isAlive: () => boolean,
): Promise<void> {
  clearError(root);
  const input = form.querySelector<HTMLInputElement>('[data-login-code]');
  const button = form.querySelector<HTMLButtonElement>('[data-login-submit]');
  if (!input || !button || state.busy) return;

  state.code = input.value;
  const normalizedCode = state.code.trim();
  if (!normalizedCode) {
    showError(root, '请填写验证码');
    return;
  }

  state.busy = true;
  setBusy(button, true, '验证中…', '登录');
  try {
    const res = await request('/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: state.rawEmail.trim().toLowerCase(),
        code: normalizedCode,
      }),
    });
    const data = (await res.json()) as { user?: unknown; error?: string };
    if (!isAlive()) return;
    if (!res.ok) {
      showError(root, data.error ?? '验证失败');
      return;
    }
    navigate('/me');
  } catch {
    if (isAlive()) showError(root, '网络错误，请重试');
  } finally {
    state.busy = false;
    if (isAlive()) paintBusy(root, state);
  }
}

export function mountLogin(
  root: ParentNode = document,
  request: LoginRequest = fetch,
  navigate: LoginNavigate = (href) => window.location.assign(href),
): () => void {
  const cleanups: Array<() => void> = [];
  for (const island of Array.from(
    root.querySelectorAll<HTMLElement>('[data-island="login"]'),
  )) {
    if (island.dataset.loginReady === '1') continue;
    island.dataset.loginReady = '1';
    let alive = true;
    const state: LoginState = {
      rawEmail:
        island.querySelector<HTMLInputElement>('[data-login-email]')?.value ?? '',
      code: '',
      busy: false,
    };

    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !island.contains(form)) return;
      event.preventDefault();
      if (form.matches('[data-login-email-form]')) {
        void requestCode(island, state, form, request, () => alive);
      } else if (form.matches('[data-login-code-form]')) {
        void verifyCode(island, state, form, request, navigate, () => alive);
      }
    };
    const onClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('[data-login-change-email]');
      if (!button || !island.contains(button)) return;
      state.code = '';
      renderEmailStep(island, state);
    };
    const onInput = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !island.contains(input)) return;
      if (input.matches('[data-login-email]')) state.rawEmail = input.value;
      if (input.matches('[data-login-code]')) state.code = input.value;
    };
    island.addEventListener('submit', onSubmit);
    island.addEventListener('click', onClick);
    island.addEventListener('input', onInput);
    cleanups.push(() => {
      alive = false;
      island.removeEventListener('submit', onSubmit);
      island.removeEventListener('click', onClick);
      island.removeEventListener('input', onInput);
      delete island.dataset.loginReady;
    });
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

mountLogin();
