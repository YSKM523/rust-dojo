// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProgress, getCompleted } from '@/lib/progress/store';
import type { JudgeResult } from '@/lib/rust/types';
import {
  createCodeMirrorEditor,
  mountExercise,
  type CodeModel,
  type EditorFactory,
} from './exercise';

type AiRequestCall = (input: string, init: RequestInit) => Promise<Response>;

const STARTER = 'fn main() {\n    // TODO\n}\n';

const AI_BTN_CLASS =
  'inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-[#f4f0e8] transition disabled:opacity-50 hover:border-brand';

function renderFixture(data: Record<string, unknown> = {}): void {
  const payload = JSON.stringify({
    id: 'm1-01',
    judgeMode: 'stdout',
    expectedStdout: 'hello\nworld',
    starterCode: STARTER,
    ...data,
  });
  document.body.innerHTML = `
    <div class="space-y-4" data-island="exercise">
      <script type="application/json" id="exercise-data">${payload}</script>
      <section class="overflow-hidden border border-line bg-panel shadow-card">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Rust Editor</p>
            <p class="mt-1 text-sm text-fg2">真实 rustc · Playground 判题</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" class="inline-flex items-center gap-2 rounded border border-line bg-panel2 px-3 py-2 text-sm font-bold text-fg transition hover:border-brand disabled:opacity-50" data-exercise-reset><svg></svg> 重置</button>
            <button type="button" class="fx-press inline-flex items-center gap-2 rounded bg-brand px-4 py-2 font-bold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50" data-exercise-run><svg></svg> <span data-exercise-run-label>运行</span></button>
          </div>
        </div>
        <div class="p-3">
          <div class="overflow-hidden border border-line bg-[#101217] font-mono">
            <div class="cm-theme-dark" aria-label="Rust 代码编辑器" data-exercise-editor></div>
          </div>
        </div>
      </section>
      <div class="border border-[#282b33] bg-[#111318] p-4 shadow-card" data-exercise-ai>
        <p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand">AI 副驾（DeepSeek）</p>
        <div class="flex flex-wrap gap-2" data-exercise-ai-actions>
          <button class="${AI_BTN_CLASS}" data-exercise-ai-action="hint"><svg></svg> <span data-exercise-ai-label>给点提示</span></button>
          <button class="${AI_BTN_CLASS}" data-exercise-ai-action="explain"><svg></svg> <span data-exercise-ai-label>解释这段 Rust</span></button>
        </div>
      </div>
    </div>`;
}

/** 轻量编辑器替身：暴露 type() 模拟学员敲字（走 onChange），setCode 走外部写入。 */
function fakeEditor(): { factory: EditorFactory; type: (code: string) => void; code: () => string } {
  let code = '';
  let notify: (next: string) => void = () => {};
  const factory: EditorFactory = (host, initialCode, onChange): CodeModel => {
    code = initialCode;
    notify = onChange;
    host.dataset.fake = '1';
    return {
      getCode: () => code,
      setCode: (next) => {
        code = next;
      },
      destroy: () => {},
    };
  };
  return {
    factory,
    type: (next) => {
      code = next;
      notify(next);
    },
    code: () => code,
  };
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function runButton(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('[data-exercise-run]')!;
}
function resetButton(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('[data-exercise-reset]')!;
}
function aiButton(action: string): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`[data-exercise-ai-action="${action}"]`);
}
function dynamicNodes(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-exercise-dynamic]'));
}
function block(label: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`section[aria-label="${label}"]`);
}

const PASSED: JudgeResult = { verdict: { passed: true }, stdout: 'hello\nworld', stderr: '' };

beforeEach(() => {
  localStorage.clear();
  clearProgress();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('exercise island', () => {
  it('runs, shows the waiting state, renders the pass banner and writes progress', async () => {
    renderFixture();
    const editor = fakeEditor();
    let resolveJudge!: (value: JudgeResult) => void;
    const judge = vi.fn(
      () =>
        new Promise<JudgeResult>((resolve) => {
          resolveJudge = resolve;
        }),
    );
    const unmount = mountExercise(document, { judge, createEditor: editor.factory });

    expect(dynamicNodes()).toHaveLength(0);
    fireEvent.click(runButton());

    expect(runButton()).toBeDisabled();
    expect(resetButton()).toBeDisabled();
    expect(document.querySelector('[data-exercise-run-label]')).toHaveTextContent(
      '正在编译运行（Rust Playground）…',
    );
    expect(dynamicNodes()).toHaveLength(1);
    expect(dynamicNodes()[0]).toHaveTextContent('等待 Rust Playground 返回结果…');
    expect(judge).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1-01', judgeMode: 'stdout', starterCode: STARTER }),
      STARTER,
    );

    resolveJudge(PASSED);
    await vi.waitFor(() => expect(runButton()).not.toBeDisabled());

    const banner = document.querySelector('[role="status"]')!;
    expect(banner).toHaveClass('bg-ok-soft', 'text-ok');
    expect(banner).toHaveTextContent('通过！答案正确。');
    expect(banner.querySelector('svg.lucide-circle-check')).toBeTruthy();
    expect(block('标准输出')).toHaveTextContent('hello world');
    expect(block('编译器信息')).toBeNull();
    expect(block('期望输出')).toBeNull();
    expect(getCompleted()).toEqual(['m1-01']);
    // 通过后 hint 按钮文案换成「复盘本题」，且不再出现 debug 按钮
    expect(aiButton('hint')).toHaveTextContent('复盘本题');
    expect(aiButton('debug')).toBeNull();

    unmount();
  });

  it('renders the fail banner, compiler output and the expected/actual diff without writing progress', async () => {
    renderFixture();
    const editor = fakeEditor();
    const judge = vi.fn(
      async (): Promise<JudgeResult> => ({
        verdict: { passed: false, reason: '输出不符：第 2 行开始与期望不同' },
        stdout: 'hello\nWORLD',
        stderr: 'warning: unused\nerror[E0308]: mismatched types',
        expectedStdout: 'hello\nworld',
      }),
    );
    const unmount = mountExercise(document, { judge, createEditor: editor.factory });

    fireEvent.click(runButton());
    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')).toBeTruthy());

    const banner = document.querySelector('[role="alert"]')!;
    expect(banner).toHaveClass('bg-bad-soft', 'text-bad');
    expect(banner).toHaveTextContent('还不对：输出不符：第 2 行开始与期望不同');
    expect(banner.querySelector('svg.lucide-circle-x')).toBeTruthy();

    const compiler = block('编译器信息')!;
    const rows = Array.from(compiler.querySelectorAll('pre > span'));
    expect(rows).toHaveLength(2);
    expect(rows[0].className).toBe('block min-h-6 ');
    expect(rows[1].className).toBe('block min-h-6 text-bad');

    const expected = block('期望输出')!;
    const actual = block('实际输出')!;
    expect(expected.querySelectorAll('pre > span')).toHaveLength(2);
    expect(expected.querySelector('[data-highlighted="true"]')).toHaveTextContent('world');
    expect(actual.querySelector('[data-highlighted="true"]')).toHaveTextContent('WORLD');
    expect(actual.querySelector('[data-highlighted="true"]')!.className).toBe(
      'block min-h-6 px-3 bg-bad-soft text-bad',
    );

    expect(getCompleted()).toEqual([]);
    // 失败态才出现「为什么报错」
    expect(aiButton('debug')).toHaveTextContent('为什么报错');
    expect(aiButton('debug')!.className).toBe(AI_BTN_CLASS);
    expect(aiButton('hint')).toHaveTextContent('给点提示');

    // 改代码即清空判题结果（Playground.changeCode）
    editor.type('fn main() { println!("hello"); }');
    expect(dynamicNodes()).toHaveLength(0);
    expect(aiButton('debug')).toBeNull();

    unmount();
  });

  it('surfaces a judge network error as the run error box and switches AI status to failed', async () => {
    renderFixture();
    const editor = fakeEditor();
    const judge = vi.fn(async () => {
      throw new Error('Playground 暂时不可用，请稍候几秒重试');
    });
    const unmount = mountExercise(document, { judge, createEditor: editor.factory });

    fireEvent.click(runButton());
    await vi.waitFor(() => expect(runButton()).not.toBeDisabled());

    const nodes = dynamicNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toHaveAttribute('role', 'alert');
    expect(nodes[0]).toHaveClass('border-bad/30', 'bg-bad-soft', 'text-bad');
    expect(nodes[0]).toHaveTextContent('运行出错：Playground 暂时不可用，请稍候几秒重试');
    expect(document.querySelector('[role="status"]')).toBeNull();
    expect(block('标准输出')).toBeNull();
    expect(aiButton('debug')).toBeTruthy();
    expect(getCompleted()).toEqual([]);

    unmount();
  });

  it('resets the editor back to starterCode and clears every result node', async () => {
    renderFixture();
    const editor = fakeEditor();
    const judge = vi.fn(async () => PASSED);
    const unmount = mountExercise(document, { judge, createEditor: editor.factory });

    editor.type('fn main() { println!("x"); }');
    fireEvent.click(runButton());
    await vi.waitFor(() => expect(document.querySelector('[role="status"]')).toBeTruthy());

    fireEvent.click(resetButton());
    expect(editor.code()).toBe(STARTER);
    expect(dynamicNodes()).toHaveLength(0);
    expect(document.querySelector('[role="status"]')).toBeNull();

    unmount();
  });

  it('mounts a real CodeMirror editor whose external writes do not re-enter changeCode', () => {
    renderFixture();
    const unmount = mountExercise(document, {
      judge: vi.fn(),
      createEditor: createCodeMirrorEditor,
    });

    const host = document.querySelector<HTMLElement>('[data-exercise-editor]')!;
    expect(host.querySelector('.cm-editor')).toBeTruthy();
    expect(host.querySelector('.cm-gutters')).toBeTruthy();
    expect(host.querySelector('.cm-content')!.textContent).toContain('fn main()');
    // foldGutter:false —— 不允许出现折叠列
    expect(host.querySelector('.cm-foldGutter')).toBeNull();

    unmount();
  });

  it('sends the AI payload for all three actions, disables the buttons while loading and renders the reply', async () => {
    renderFixture();
    const editor = fakeEditor();
    const judge = vi.fn(
      async (): Promise<JudgeResult> => ({
        verdict: { passed: false, reason: '编译或运行失败' },
        stdout: '',
        stderr: 'error[E0425]: cannot find value',
      }),
    );
    let resolveAi!: (value: Response) => void;
    const request = vi.fn<AiRequestCall>(
      () =>
        new Promise<Response>((resolve) => {
          resolveAi = resolve;
        }),
    );
    const unmount = mountExercise(document, { judge, request, createEditor: editor.factory });

    editor.type('fn main() { oops }');
    fireEvent.click(runButton());
    await vi.waitFor(() => expect(aiButton('debug')).toBeTruthy());

    // 1) debug 动作：三个按钮全禁用，文案切「思考中…」
    fireEvent.click(aiButton('debug')!);
    expect(aiButton('hint')).toBeDisabled();
    expect(aiButton('explain')).toBeDisabled();
    expect(aiButton('debug')).toBeDisabled();
    expect(aiButton('debug')).toHaveTextContent('思考中…');
    expect(aiButton('hint')).toHaveTextContent('给点提示');

    const [url, init] = request.mock.calls[0];
    expect(url).toBe('/api/ai');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual({
      action: 'debug',
      exerciseId: 'm1-01',
      code: 'fn main() { oops }',
      errorMsg: 'error[E0425]: cannot find value',
      status: 'failed',
    });

    resolveAi(response({ reply: '想想 oops 是什么？' }));
    await vi.waitFor(() => expect(aiButton('debug')).not.toBeDisabled());
    const reply = document.querySelector('[data-exercise-ai-reply]')!;
    expect(reply).toHaveClass('whitespace-pre-wrap', 'text-[#f4f0e8]');
    expect(reply).toHaveTextContent('想想 oops 是什么？');
    expect(aiButton('debug')).toHaveTextContent('为什么报错');

    // 2) hint 动作：新请求先清掉上一条回复
    fireEvent.click(aiButton('hint')!);
    expect(document.querySelector('[data-exercise-ai-reply]')).toBeNull();
    expect(aiButton('hint')).toHaveTextContent('思考中…');
    resolveAi(response({ reply: '提示：先看类型' }));
    await vi.waitFor(() => expect(aiButton('hint')).not.toBeDisabled());
    expect(JSON.parse(String(request.mock.calls[1][1].body))).toMatchObject(
      { action: 'hint', status: 'failed' },
    );

    // 3) explain 动作 + 服务端错误分支
    fireEvent.click(aiButton('explain')!);
    resolveAi(response({ error: 'AI 暂时不可用' }, 500));
    await vi.waitFor(() => expect(aiButton('explain')).not.toBeDisabled());
    expect(JSON.parse(String(request.mock.calls[2][1].body))).toMatchObject(
      { action: 'explain' },
    );
    const aiError = document.querySelector('[data-exercise-ai-error]')!;
    expect(aiError).toHaveAttribute('role', 'alert');
    expect(aiError).toHaveClass('mt-3', 'text-sm', 'text-bad');
    expect(aiError).toHaveTextContent('AI 暂时不可用');
    expect(document.querySelector('[data-exercise-ai-reply]')).toBeNull();

    unmount();
  });

  it('falls back to the network error copy and omits errorMsg once the exercise passed', async () => {
    renderFixture();
    const editor = fakeEditor();
    const judge = vi.fn(async () => PASSED);
    const request = vi
      .fn<AiRequestCall>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(response({ reply: '复盘：所有权转移' }));
    const unmount = mountExercise(document, { judge, request, createEditor: editor.factory });

    fireEvent.click(runButton());
    await vi.waitFor(() => expect(aiButton('hint')).toHaveTextContent('复盘本题'));

    fireEvent.click(aiButton('hint')!);
    await vi.waitFor(() =>
      expect(document.querySelector('[data-exercise-ai-error]')).toHaveTextContent(
        '网络错误，请重试',
      ),
    );

    const body = JSON.parse(String(request.mock.calls[0][1].body));
    expect(body.status).toBe('passed');
    expect('errorMsg' in body).toBe(false);

    fireEvent.click(aiButton('hint')!);
    await vi.waitFor(() =>
      expect(document.querySelector('[data-exercise-ai-reply]')).toHaveTextContent(
        '复盘：所有权转移',
      ),
    );
    expect(document.querySelector('[data-exercise-ai-error]')).toBeNull();

    unmount();
  });

  it('does nothing when the island root or the inline JSON is missing', () => {
    document.body.innerHTML = '<div data-island="exercise"></div>';
    expect(mountExercise(document, { judge: vi.fn() })()).toBeUndefined();
    document.body.innerHTML = '<div></div>';
    expect(mountExercise(document, { judge: vi.fn() })()).toBeUndefined();
  });
});