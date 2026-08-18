// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountLogin } from './login';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderFixture(): void {
  document.body.innerHTML = `
    <section data-island="login">
      <div>
        <p data-login-step-label>EMAIL PASS</p>
        <p data-login-step-description>输入邮箱，领取一次性验证码。</p>
      </div>
      <div data-login-content>
        <form class="space-y-4" novalidate data-login-email-form>
          <input type="email" required aria-label="邮箱" aria-invalid="false" placeholder="you@example.com" class="w-full border border-line bg-panel2 px-4 py-3 text-fg placeholder:text-fg3" data-login-email>
          <button type="submit" class="w-full bg-brand px-4 py-3 font-bold text-white transition hover:bg-brand-hover disabled:opacity-50" data-login-submit>发送验证码</button>
        </form>
      </div>
    </section>`;
}

beforeEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('login island', () => {
  it('uses the React validation messages without making a request', () => {
    renderFixture();
    const request = vi.fn();
    const unmount = mountLogin(document, request, vi.fn());
    const form = document.querySelector('form')!;
    const input = document.querySelector<HTMLInputElement>('[data-login-email]')!;

    fireEvent.submit(form);
    expect(document.querySelector('[role="alert"]')).toHaveTextContent('请填写邮箱');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'login-error');

    input.value = 'invalid@example';
    fireEvent.submit(form);
    expect(document.querySelector('[role="alert"]')).toHaveTextContent('请输入有效邮箱');
    expect(request).not.toHaveBeenCalled();
    unmount();
  });

  it('normalizes the request payload, shows busy state, then renders the code step with raw email', async () => {
    renderFixture();
    let resolveRequest!: (value: Response) => void;
    const request = vi.fn(
      () => new Promise<Response>((resolve) => { resolveRequest = resolve; }),
    );
    const unmount = mountLogin(document, request, vi.fn());
    const input = document.querySelector<HTMLInputElement>('[data-login-email]')!;
    input.value = 'Learner@Example.COM';

    fireEvent.submit(document.querySelector('form')!);

    const button = document.querySelector<HTMLButtonElement>('[data-login-submit]')!;
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('发送中…');
    expect(request).toHaveBeenCalledWith('/api/auth/request-code', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'learner@example.com' }),
    });

    resolveRequest(response({ ok: true }));
    await vi.waitFor(() => expect(document.querySelector('[data-login-code-form]')).toBeInTheDocument());

    expect(document.querySelector('[data-login-step-label]')).toHaveTextContent('VERIFY CODE');
    expect(document.querySelector('[data-login-step-description]')).toHaveTextContent('输入 6 位验证码继续。');
    expect(document.querySelector('[data-login-destination]')).toHaveTextContent('Learner@Example.COM');
    expect(document.querySelector('[data-login-code]')).toHaveAttribute('inputmode', 'numeric');
    expect(document.querySelector('[data-login-code]')).not.toHaveAttribute('maxlength');
    unmount();
  });

  it('shows the API request-code error verbatim and restores the submit button', async () => {
    renderFixture();
    const request = vi.fn().mockResolvedValue(response({ error: '请求太频繁' }, 429));
    const unmount = mountLogin(document, request, vi.fn());
    const input = document.querySelector<HTMLInputElement>('[data-login-email]')!;
    input.value = 'learner@example.com';

    fireEvent.submit(document.querySelector('form')!);

    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')).toHaveTextContent('请求太频繁'));
    expect(document.querySelector('[data-login-submit]')).not.toBeDisabled();
    expect(document.querySelector('[data-login-submit]')).toHaveTextContent('发送验证码');
    expect(document.querySelector('[data-login-email-form]')).toBeInTheDocument();
    unmount();
  });

  it('tracks email edits made while request-code is pending like React controlled state', async () => {
    renderFixture();
    let resolveRequest!: (value: Response) => void;
    const request = vi.fn(
      () => new Promise<Response>((resolve) => { resolveRequest = resolve; }),
    );
    const unmount = mountLogin(document, request, vi.fn());
    const input = document.querySelector<HTMLInputElement>('[data-login-email]')!;
    input.value = 'first@example.com';
    fireEvent.input(input);
    fireEvent.submit(document.querySelector('form')!);

    input.value = 'Latest@Example.COM';
    fireEvent.input(input);
    resolveRequest(response({ ok: true }));

    await vi.waitFor(() => expect(document.querySelector('[data-login-code-form]')).toBeInTheDocument());
    expect(document.querySelector('[data-login-destination]')).toHaveTextContent('Latest@Example.COM');
    unmount();
  });

  it('uses the original network error when request-code fetch or JSON parsing fails', async () => {
    renderFixture();
    const request = vi.fn().mockRejectedValue(new Error('offline'));
    const unmount = mountLogin(document, request, vi.fn());
    const input = document.querySelector<HTMLInputElement>('[data-login-email]')!;
    input.value = 'learner@example.com';

    fireEvent.submit(document.querySelector('form')!);

    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')).toHaveTextContent('网络错误，请重试'));
    unmount();
  });

  it('trims the code, posts normalized credentials, and navigates to me on success', async () => {
    renderFixture();
    const request = vi
      .fn()
      .mockResolvedValueOnce(response({ ok: true }))
      .mockResolvedValueOnce(response({ user: { email: 'learner@example.com' } }));
    const navigate = vi.fn();
    const unmount = mountLogin(document, request, navigate);
    const email = document.querySelector<HTMLInputElement>('[data-login-email]')!;
    email.value = 'Learner@Example.COM';
    fireEvent.submit(document.querySelector('form')!);
    await vi.waitFor(() => expect(document.querySelector('[data-login-code-form]')).toBeInTheDocument());

    const code = document.querySelector<HTMLInputElement>('[data-login-code]')!;
    code.value = ' 123456 ';
    fireEvent.submit(document.querySelector('form')!);

    expect(document.querySelector('[data-login-submit]')).toBeDisabled();
    expect(document.querySelector('[data-login-submit]')).toHaveTextContent('验证中…');
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/me'));
    expect(request).toHaveBeenNthCalledWith(2, '/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'learner@example.com', code: '123456' }),
    });
    unmount();
  });

  it('validates only code presence and surfaces verify API errors verbatim', async () => {
    renderFixture();
    const request = vi
      .fn()
      .mockResolvedValueOnce(response({ ok: true }))
      .mockResolvedValueOnce(response({ error: '验证码错误' }, 401));
    const navigate = vi.fn();
    const unmount = mountLogin(document, request, navigate);
    const email = document.querySelector<HTMLInputElement>('[data-login-email]')!;
    email.value = 'learner@example.com';
    fireEvent.submit(document.querySelector('form')!);
    await vi.waitFor(() => expect(document.querySelector('[data-login-code-form]')).toBeInTheDocument());

    fireEvent.submit(document.querySelector('form')!);
    expect(document.querySelector('[role="alert"]')).toHaveTextContent('请填写验证码');
    expect(request).toHaveBeenCalledTimes(1);

    const code = document.querySelector<HTMLInputElement>('[data-login-code]')!;
    code.value = 'abc';
    fireEvent.submit(document.querySelector('form')!);
    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')).toHaveTextContent('验证码错误'));
    expect(navigate).not.toHaveBeenCalled();
    unmount();
  });

  it('switches back to email while preserving raw email and clearing code and errors', async () => {
    renderFixture();
    const request = vi.fn().mockResolvedValue(response({ ok: true }));
    const unmount = mountLogin(document, request, vi.fn());
    const email = document.querySelector<HTMLInputElement>('[data-login-email]')!;
    email.value = 'Learner@Example.COM';
    fireEvent.submit(document.querySelector('form')!);
    await vi.waitFor(() => expect(document.querySelector('[data-login-code-form]')).toBeInTheDocument());

    fireEvent.submit(document.querySelector('form')!);
    expect(document.querySelector('[role="alert"]')).toHaveTextContent('请填写验证码');
    fireEvent.click(document.querySelector('[data-login-change-email]')!);

    expect(document.querySelector<HTMLInputElement>('[data-login-email]')).toHaveValue('Learner@Example.COM');
    expect(document.querySelector('[data-login-code]')).not.toBeInTheDocument();
    expect(document.querySelector('[role="alert"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-login-step-label]')).toHaveTextContent('EMAIL PASS');
    unmount();
  });

  it('allows changing email during verify and keeps the current form busy until verify settles', async () => {
    renderFixture();
    let resolveVerify!: (value: Response) => void;
    const request = vi
      .fn()
      .mockResolvedValueOnce(response({ ok: true }))
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => { resolveVerify = resolve; }),
      );
    const unmount = mountLogin(document, request, vi.fn());
    const email = document.querySelector<HTMLInputElement>('[data-login-email]')!;
    email.value = 'learner@example.com';
    fireEvent.input(email);
    fireEvent.submit(document.querySelector('form')!);
    await vi.waitFor(() => expect(document.querySelector('[data-login-code-form]')).toBeInTheDocument());

    const code = document.querySelector<HTMLInputElement>('[data-login-code]')!;
    code.value = '123456';
    fireEvent.input(code);
    fireEvent.submit(document.querySelector('form')!);
    fireEvent.click(document.querySelector('[data-login-change-email]')!);

    expect(document.querySelector('[data-login-email-form]')).toBeInTheDocument();
    expect(document.querySelector('[data-login-submit]')).toBeDisabled();
    expect(document.querySelector('[data-login-submit]')).toHaveTextContent('发送中…');

    resolveVerify(response({ error: '验证码错误' }, 401));
    await vi.waitFor(() => expect(document.querySelector('[data-login-submit]')).not.toBeDisabled());
    expect(document.querySelector('[data-login-submit]')).toHaveTextContent('发送验证码');
    expect(document.querySelector('[role="alert"]')).toHaveTextContent('验证码错误');
    unmount();
  });

  it('ignores an in-flight request after cleanup', async () => {
    renderFixture();
    let resolveRequest!: (value: Response) => void;
    const request = vi.fn(
      () => new Promise<Response>((resolve) => { resolveRequest = resolve; }),
    );
    const navigate = vi.fn();
    const unmount = mountLogin(document, request, navigate);
    const input = document.querySelector<HTMLInputElement>('[data-login-email]')!;
    input.value = 'learner@example.com';
    fireEvent.input(input);
    fireEvent.submit(document.querySelector('form')!);

    unmount();
    resolveRequest(response({ ok: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(document.querySelector('[data-login-email-form]')).toBeInTheDocument();
    expect(document.querySelector('[data-login-code-form]')).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
