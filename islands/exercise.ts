/**
 * exercise island — 练习页工作台（Rust 编辑器 / 判题 / 输出 / AI 副驾）
 *
 * 语义事实源（逐行为移植，改这里前先回去读原文件）：
 *   - components/Playground.tsx     运行/重置/改码的状态流转、aiStatus 推导、
 *                                   判过 markCompleted(exercise.id)
 *   - components/CodeEditor.tsx     CodeMirror 装配：rust()、height 360px、
 *                                   theme="dark"（**写死 dark，不跟随 data-theme**——
 *                                   原组件就是写死的，外层 bg-[#101217] 同样写死，
 *                                   island 照原样，不自作主张跟主题切换）
 *   - components/VerdictBanner.tsx  role/类名/文案
 *   - components/RunOutput.tsx      标准输出 / 编译器信息 / 期望-实际双栏 diff 的条件渲染
 *   - components/AiCopilot.tsx      三动作、loading、错误与回复渲染
 *   - lib/rust/judge.ts             判题**零分叉复用**（esbuild alias @ 直接 import 原文件）
 *   - lib/rust/normalize.ts         diff 栏的行归一化（原文件）
 *   - lib/progress/store.ts         markCompleted（共享 chunk 单例，与 progress-badge 同一份）
 *
 * CodeMirror 装配等价性说明（对照 @uiw/react-codemirror 4.25 的实际扩展顺序）：
 *   [updateListener, EditorView.theme({'&':{height:'360px'}}), scrollerTheme,
 *    basicSetup(四项覆盖), keymap.of([indentWithTab]), oneDark, rust()]
 *   basicSetup 用 @uiw 版语义逐条展开：lineNumbers / highlightActiveLineGutter /
 *   highlightSpecialChars / history / **不要 foldGutter**（CodeEditor.tsx 传 false）/
 *   drawSelection / dropCursor / allowMultipleSelections / indentOnInput /
 *   syntaxHighlighting(defaultHighlightStyle,{fallback:true}) / bracketMatching /
 *   closeBrackets / autocompletion / rectangularSelection / **不要 crosshairCursor**
 *   （@uiw 版默认 false，与官方 codemirror 包的 basicSetup 不同）/ highlightActiveLine /
 *   highlightSelectionMatches / keymap(closeBrackets+default+search+history+fold+completion+lint)。
 *   外层容器类名 `cm-theme-dark` 与 aria-label 由模板写死（React 版由 <CodeMirror> 透传）。
 *
 * ============================ 挂载协议 ============================
 * Task 13 的 /exercise/[id] 模板按下面写 DOM。Tailwind 类名一律照搬对应 TSX。
 * 凡是 React 版「条件渲染 / 状态文案」的节点，模板只输出 **初始态**（result=null、
 * error=null、running=false、aiStatus='idle'、AI 无 loading/reply/error）。
 *
 * ---- 1. 练习数据（内联 JSON） -------------------------------------
 *
 *   <script type="application/json" id="exercise-data">{ … }</script>
 *
 *   - 选择器 `#exercise-data`，放在 island 根内的第一个子节点（<script> 是
 *     display:none，落在 space-y-4 里不产生任何像素）。
 *   - 字段（**只放判题与重置所需，solutionCode 绝不出现**）：
 *       id            string   progress store id，判过写它
 *       judgeMode     'stdout' | 'compile' | 'tests'
 *       starterCode   string   重置按钮恢复的初始代码
 *       expectedStdout string? 选填（judge 用；现网本来就发到客户端，泄漏面不扩大）
 *       hiddenTests   string?  选填（judgeMode==='tests' 用）
 *       assertSource  string?  选填
 *       crateType     'bin' | 'lib' | 缺省
 *   - 模板必须把内容里的 `</` 转义成 `<\/`，否则提前闭合 <script>。
 *
 * ---- 2. island 根与编辑器 -----------------------------------------
 *
 *   <div class="space-y-4" data-island="exercise">
 *     <script type="application/json" id="exercise-data">…</script>
 *     <section class="overflow-hidden border border-line bg-panel shadow-card">
 *       <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
 *         <div>
 *           <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Rust Editor</p>
 *           <p class="mt-1 text-sm text-fg2">真实 rustc · Playground 判题</p>
 *         </div>
 *         <div class="flex items-center gap-2">
 *           <button type="button" data-exercise-reset class="RESET_CLASS"><svg lucide-rotate-ccw 15/> 重置</button>
 *           <button type="button" data-exercise-run class="RUN_CLASS"><svg lucide-play 16/> <span data-exercise-run-label>运行</span></button>
 *         </div>
 *       </div>
 *       <div class="p-3">
 *         <div class="overflow-hidden border border-line bg-[#101217] font-mono">
 *           <div class="cm-theme-dark" aria-label="Rust 代码编辑器" data-exercise-editor></div>
 *         </div>
 *       </div>
 *     </section>
 *     … 见 3 / 4 …
 *   </div>
 *
 *   - [data-exercise-editor] 必须是**空**容器（CodeMirror 挂进去）。
 *   - 运行按钮的文案节点必须是 [data-exercise-run-label]（React 那里是裸文本，
 *     island 需要一个可寻址节点；<span> 不带样式，零像素差——与 checklist island
 *     的 [data-copy-idle]/[data-hint-collapsed] 同一处理）。
 *   - 两个按钮的 disabled 由 island 在 running 时加/摘，模板初始不带。
 *
 * ---- 3. 提示 details 与导航（纯静态，island 不碰） ------------------
 *
 *   exercise.hints 非空时模板输出 Playground.tsx 里那段 <details>；
 *   ExerciseNavBar 是纯链接，同样全部归模板。
 *
 * ---- 4. AI 副驾（模板输出 idle 初始态） ---------------------------
 *
 *   <div class="border border-[#282b33] bg-[#111318] p-4 shadow-card" data-exercise-ai>
 *     <p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand">AI 副驾（DeepSeek）</p>
 *     <div class="flex flex-wrap gap-2" data-exercise-ai-actions>
 *       <button class="AI_BTN" data-exercise-ai-action="hint"><svg lucide-lightbulb 15/> <span data-exercise-ai-label>给点提示</span></button>
 *       <button class="AI_BTN" data-exercise-ai-action="explain"><svg lucide-search 15/> <span data-exercise-ai-label>解释这段 Rust</span></button>
 *     </div>
 *   </div>
 *
 *   - AI 按钮**不带 type 属性**（React 版就没有；不在 form 内，行为一致）。
 *   - 「为什么报错」按钮只在 aiStatus==='failed' 出现，由 island 动态增删
 *     （React 版是 `{status === 'failed' && <button/>}`，SSR 初始态没有它）。
 *   - AI 错误 <p role="alert"> 与回复 <p> 同样由 island 动态增删。
 *   - hint 按钮文案随 aiStatus 变：passed→「复盘本题」，否则「给点提示」。
 *
 * ---- 5. island 动态插入区（模板不要写任何占位节点！） ---------------
 *
 *   运行出错框 / VerdictBanner / RunOutput 三块按 React 顺序插在
 *   **[data-exercise-ai] 之前**（即 hints details 之后）。它们全部带
 *   `data-exercise-dynamic` 标记，island 每次重绘先整体删再插。
 *
 *   ⚠️ 模板绝对不要预留空占位 <div>：根是 space-y-4，多一个空元素就多 16px 间距。
 *      React 版 result=null / error=null 时压根不渲染节点，模板照做。
 *
 *   动态节点结构（照 VerdictBanner.tsx / RunOutput.tsx）：
 *     运行出错：<div role="alert" class="border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad">运行出错：{msg}</div>
 *     通过：    <div role="status" class="flex items-center gap-2 rounded-md border border-ok/30 bg-ok-soft px-4 py-3 text-sm font-medium text-ok"><svg lucide-circle-check 18/> 通过！答案正确。</div>
 *     未通过：  <div role="alert"  class="flex items-center gap-2 rounded-md border border-bad/30 bg-bad-soft px-4 py-3 text-sm font-medium text-bad"><svg lucide-circle-x 18/> 还不对：{reason}</div>
 *     运行中：  <p class="text-sm text-fg3">等待 Rust Playground 返回结果…</p>
 *     结果区：  <div class="space-y-4">标准输出 [+ 编译器信息] [+ 期望/实际双栏]</div>
 *
 * 所有用户文本（verdict.reason / stdout / stderr / AI 回复）都走 textContent，
 * 不做 HTML 插值。
 */

import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { rust } from '@codemirror/lang-rust';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Annotation, EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { markCompleted } from '@/lib/progress/store';
import { judgeExercise } from '@/lib/rust/judge';
import { normalizeStdout } from '@/lib/rust/normalize';
import type { JudgeResult, Verdict } from '@/lib/rust/types';

/* ------------------------------------------------------------------ */
/* 类型与依赖注入口                                                     */
/* ------------------------------------------------------------------ */

export type AiAction = 'hint' | 'explain' | 'debug';
export type AiStatus = 'idle' | 'passed' | 'failed';

/** 内联 JSON 的形状：judge 所需字段 + 重置所需 starterCode，**没有 solutionCode**。 */
export interface ExerciseData {
  id: string;
  judgeMode: 'stdout' | 'compile' | 'tests';
  starterCode: string;
  expectedStdout?: string;
  hiddenTests?: string;
  assertSource?: string;
  crateType?: 'bin' | 'lib';
}

/** 编辑器抽象：默认实现是 CodeMirror 6，测试可注入轻量替身。 */
export interface CodeModel {
  getCode(): string;
  /** 外部写入（重置）——等价于 React 版 value prop 变化，**不触发 onChange**。 */
  setCode(code: string): void;
  destroy(): void;
}

export type EditorFactory = (
  host: HTMLElement,
  initialCode: string,
  onChange: (code: string) => void,
) => CodeModel;

export type JudgeFn = (exercise: ExerciseData, code: string) => Promise<JudgeResult>;
export type AiRequest = (input: string, init: RequestInit) => Promise<Response>;

export interface ExerciseDeps {
  judge?: JudgeFn;
  request?: AiRequest;
  createEditor?: EditorFactory;
}

/* ------------------------------------------------------------------ */
/* lucide 图标（与模板里的内联 SVG 同源，size 照搬对应 TSX）              */
/* ------------------------------------------------------------------ */

const ICON_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

const ICON_CIRCLE_CHECK = `<svg ${ICON_ATTRS} width="18" height="18" class="lucide lucide-circle-check"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>`;
const ICON_CIRCLE_X = `<svg ${ICON_ATTRS} width="18" height="18" class="lucide lucide-circle-x"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>`;
const ICON_BUG = `<svg ${ICON_ATTRS} width="15" height="15" class="lucide lucide-bug"><path d="M12 20v-9"></path><path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z"></path><path d="M14.12 3.88 16 2"></path><path d="M21 21a4 4 0 0 0-3.81-4"></path><path d="M21 5a4 4 0 0 1-3.55 3.97"></path><path d="M22 13h-4"></path><path d="M3 21a4 4 0 0 1 3.81-4"></path><path d="M3 5a4 4 0 0 0 3.55 3.97"></path><path d="M6 13H2"></path><path d="m8 2 1.88 1.88"></path><path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"></path></svg>`;

/** AI 按钮类名，照搬 AiCopilot.tsx 的 `btn` 常量（模板与 island 必须一致）。 */
const AI_BTN_CLASS =
  'inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-[#f4f0e8] transition disabled:opacity-50 hover:border-brand';

function iconNode(markup: string): Element {
  const holder = document.createElement('template');
  holder.innerHTML = markup;
  return holder.content.firstElementChild as Element;
}

/* ------------------------------------------------------------------ */
/* 动态 DOM 构造（逐节点照 VerdictBanner.tsx / RunOutput.tsx）           */
/* ------------------------------------------------------------------ */

function runErrorBox(message: string): HTMLElement {
  const box = document.createElement('div');
  box.setAttribute('role', 'alert');
  box.className = 'border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad';
  box.append('运行出错：', message);
  return box;
}

function verdictBanner(verdict: Verdict): HTMLElement {
  const box = document.createElement('div');
  if (verdict.passed) {
    box.setAttribute('role', 'status');
    box.className =
      'flex items-center gap-2 rounded-md border border-ok/30 bg-ok-soft px-4 py-3 text-sm font-medium text-ok';
    box.append(iconNode(ICON_CIRCLE_CHECK), ' 通过！答案正确。');
    return box;
  }
  box.setAttribute('role', 'alert');
  box.className =
    'flex items-center gap-2 rounded-md border border-bad/30 bg-bad-soft px-4 py-3 text-sm font-medium text-bad';
  box.append(iconNode(ICON_CIRCLE_X), ' 还不对：', verdict.reason ?? '结果与期望不一致');
  return box;
}

const PANEL_SECTION_CLASS = 'overflow-hidden border border-line bg-panel';
const PANEL_HEAD_CLASS =
  'border-b border-line bg-panel2 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-fg3';

function panelSection(label: string, preClass: string): { section: HTMLElement; pre: HTMLElement } {
  const section = document.createElement('section');
  section.setAttribute('aria-label', label);
  section.className = PANEL_SECTION_CLASS;
  const head = document.createElement('h3');
  head.className = PANEL_HEAD_CLASS;
  head.textContent = label;
  const pre = document.createElement('pre');
  pre.className = preClass;
  section.append(head, pre);
  return { section, pre };
}

function outputBlock(label: string, content: string, emptyLabel: string): HTMLElement {
  const { section, pre } = panelSection(
    label,
    'max-h-64 overflow-auto whitespace-pre-wrap px-3 py-3 font-mono text-sm leading-6 text-fg',
  );
  if (content) {
    pre.textContent = content;
  } else {
    const empty = document.createElement('span');
    empty.className = 'text-fg3';
    empty.textContent = emptyLabel;
    pre.append(empty);
  }
  return section;
}

const ERROR_LINE_RE = /^\s*error(?:\[[^\]]+\])?:/;

function compilerOutput(stderr: string): HTMLElement {
  const { section, pre } = panelSection(
    '编译器信息',
    'max-h-72 overflow-auto whitespace-pre-wrap px-3 py-3 font-mono text-sm leading-6 text-fg2',
  );
  for (const line of stderr.split('\n')) {
    const row = document.createElement('span');
    // 模板字面量末尾的空格是 React 版原样（`block min-h-6 ${cond ? 'text-bad' : ''}`）。
    row.className = `block min-h-6 ${ERROR_LINE_RE.test(line) ? 'text-bad' : ''}`;
    row.textContent = line || '\u00a0';
    pre.append(row);
  }
  return section;
}

function diffBlock(label: string, output: string, highlightedLine: number): HTMLElement {
  const { section, pre } = panelSection(
    label,
    'max-h-64 overflow-auto py-2 font-mono text-sm leading-6 text-fg',
  );
  const normalized = normalizeStdout(output);
  const lines = normalized === '' ? [''] : normalized.split('\n');
  lines.forEach((line, index) => {
    const highlighted = index + 1 === highlightedLine;
    const row = document.createElement('span');
    if (highlighted) row.setAttribute('data-highlighted', 'true');
    row.className = `block min-h-6 px-3 ${highlighted ? 'bg-bad-soft text-bad' : ''}`;
    row.textContent = line || '\u00a0';
    pre.append(row);
  });
  return section;
}

/** RunOutput.tsx 组件内私有的同名函数，逐行移植（与 judge.ts 里的那份不是同一个）。 */
function findFirstDifferingLine(actual: string, expected: string): number {
  const actualNormalized = normalizeStdout(actual);
  const expectedNormalized = normalizeStdout(expected);
  const actualLines = actualNormalized === '' ? [] : actualNormalized.split('\n');
  const expectedLines = expectedNormalized === '' ? [] : expectedNormalized.split('\n');
  const commonLength = Math.min(actualLines.length, expectedLines.length);
  for (let index = 0; index < commonLength; index += 1) {
    if (actualLines[index] !== expectedLines[index]) return index + 1;
  }
  return commonLength + 1;
}

function runOutput(result: JudgeResult | null, running: boolean): HTMLElement | null {
  if (!result) {
    if (!running) return null;
    const waiting = document.createElement('p');
    waiting.className = 'text-sm text-fg3';
    waiting.textContent = '等待 Rust Playground 返回结果…';
    return waiting;
  }

  const showDiff =
    !result.verdict.passed && result.expectedStdout !== undefined && result.stdout !== undefined;
  const diffLine = showDiff
    ? findFirstDifferingLine(result.stdout ?? '', result.expectedStdout ?? '')
    : -1;

  const wrap = document.createElement('div');
  wrap.className = 'space-y-4';
  wrap.append(outputBlock('标准输出', result.stdout ?? '', '（无标准输出）'));
  if (result.stderr) wrap.append(compilerOutput(result.stderr));
  if (showDiff) {
    const grid = document.createElement('div');
    grid.className = 'grid gap-4 sm:grid-cols-2';
    grid.append(
      diffBlock('期望输出', result.expectedStdout ?? '', diffLine),
      diffBlock('实际输出', result.stdout ?? '', diffLine),
    );
    wrap.append(grid);
  }
  return wrap;
}

/* ------------------------------------------------------------------ */
/* CodeMirror 6 默认编辑器                                              */
/* ------------------------------------------------------------------ */

/** 外部写入标记，等价于 @uiw/react-codemirror 的 ExternalChange annotation。 */
const ExternalChange = Annotation.define<boolean>();

export const createCodeMirrorEditor: EditorFactory = (host, initialCode, onChange) => {
  const view = new EditorView({
    state: EditorState.create({
      doc: initialCode,
      extensions: [
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          if (update.transactions.some((tr) => tr.annotation(ExternalChange))) return;
          onChange(update.state.doc.toString());
        }),
        EditorView.theme({ '&': { height: '360px' } }),
        EditorView.theme({ '& .cm-scroller': { height: '100% !important' } }),
        // ---- @uiw basicSetup({lineNumbers,highlightActiveLine,highlightActiveLineGutter:true, foldGutter:false}) ----
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),
        // ---- /basicSetup ----
        keymap.of([indentWithTab]),
        oneDark,
        rust(),
      ],
    }),
    parent: host,
  });

  return {
    getCode: () => view.state.doc.toString(),
    setCode: (code) => {
      if (code === view.state.doc.toString()) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: code },
        annotations: ExternalChange.of(true),
      });
    },
    destroy: () => view.destroy(),
  };
};

/* ------------------------------------------------------------------ */
/* 挂载                                                                */
/* ------------------------------------------------------------------ */

function readExerciseData(root: ParentNode): ExerciseData | null {
  const node = root.querySelector('#exercise-data');
  if (!node) return null;
  try {
    const parsed = JSON.parse(node.textContent ?? '') as ExerciseData;
    return parsed && typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

const NOOP = (): void => {};

export function mountExercise(root: ParentNode = document, deps: ExerciseDeps = {}): () => void {
  const island = root.querySelector<HTMLElement>('[data-island="exercise"]');
  if (!island || island.dataset.exerciseReady === '1') return NOOP;
  const data = readExerciseData(island) ?? readExerciseData(root);
  const editorHost = island.querySelector<HTMLElement>('[data-exercise-editor]');
  if (!data || !editorHost) return NOOP;
  island.dataset.exerciseReady = '1';

  const judge = deps.judge ?? (judgeExercise as unknown as JudgeFn);
  const request: AiRequest = deps.request ?? ((input, init) => fetch(input, init));
  const createEditor = deps.createEditor ?? createCodeMirrorEditor;

  const runButton = island.querySelector<HTMLButtonElement>('[data-exercise-run]');
  const runLabel = island.querySelector<HTMLElement>('[data-exercise-run-label]');
  const resetButton = island.querySelector<HTMLButtonElement>('[data-exercise-reset]');
  const aiRoot = island.querySelector<HTMLElement>('[data-exercise-ai]');
  const aiActions = island.querySelector<HTMLElement>('[data-exercise-ai-actions]');

  // Playground.tsx 的四个 state
  let running = false;
  let result: JudgeResult | null = null;
  let error: string | null = null;
  // AiCopilot.tsx 的三个 state（**不随 run/reset 清空**，与 React 保持一致）
  let aiLoading: AiAction | null = null;
  let aiReply: string | null = null;
  let aiError: string | null = null;

  const editor = createEditor(editorHost, data.starterCode, () => changeCode());

  function aiStatus(): AiStatus {
    if (error || (result && !result.verdict.passed)) return 'failed';
    if (result?.verdict.passed) return 'passed';
    return 'idle';
  }

  function paintBusy(): void {
    if (runButton) runButton.disabled = running;
    if (resetButton) resetButton.disabled = running;
    if (runLabel) {
      runLabel.textContent = running ? '正在编译运行（Rust Playground）…' : '运行';
    }
  }

  function paintRun(): void {
    for (const node of Array.from(island!.querySelectorAll('[data-exercise-dynamic]'))) {
      node.remove();
    }
    const nodes: HTMLElement[] = [];
    // 与 React 的 `{error && …}` 一致：空串错误不渲染节点（truthy 判定，不是 !== null）。
    if (error) nodes.push(runErrorBox(error));
    if (result) nodes.push(verdictBanner(result.verdict));
    const output = runOutput(result, running);
    if (output) nodes.push(output);
    for (const node of nodes) {
      node.setAttribute('data-exercise-dynamic', '');
      if (aiRoot) aiRoot.before(node);
      else island!.append(node);
    }
  }

  function aiButton(action: AiAction): HTMLButtonElement | null {
    return island!.querySelector<HTMLButtonElement>(`[data-exercise-ai-action="${action}"]`);
  }

  function ensureDebugButton(present: boolean): void {
    const existing = aiButton('debug');
    if (!present) {
      existing?.remove();
      return;
    }
    if (existing || !aiActions) return;
    const button = document.createElement('button');
    button.className = AI_BTN_CLASS;
    button.dataset.exerciseAiAction = 'debug';
    const label = document.createElement('span');
    label.dataset.exerciseAiLabel = '';
    label.textContent = '为什么报错';
    button.append(iconNode(ICON_BUG), ' ', label);
    aiActions.append(button);
  }

  function setAiLabel(action: AiAction, text: string): void {
    const label = aiButton(action)?.querySelector<HTMLElement>('[data-exercise-ai-label]');
    if (label) label.textContent = text;
  }

  function paintAi(): void {
    if (!aiRoot) return;
    const status = aiStatus();
    ensureDebugButton(status === 'failed');

    setAiLabel('hint', aiLoading === 'hint' ? '思考中…' : status === 'passed' ? '复盘本题' : '给点提示');
    setAiLabel('explain', aiLoading === 'explain' ? '思考中…' : '解释这段 Rust');
    setAiLabel('debug', aiLoading === 'debug' ? '思考中…' : '为什么报错');

    for (const action of ['hint', 'explain', 'debug'] as AiAction[]) {
      const button = aiButton(action);
      if (button) button.disabled = Boolean(aiLoading);
    }

    aiRoot.querySelector('[data-exercise-ai-error]')?.remove();
    aiRoot.querySelector('[data-exercise-ai-reply]')?.remove();
    // 同上，照 AiCopilot.tsx 的 `{error && …}`。
    if (aiError) {
      const node = document.createElement('p');
      node.setAttribute('role', 'alert');
      node.setAttribute('data-exercise-ai-error', '');
      node.className = 'mt-3 text-sm text-bad';
      node.textContent = aiError;
      aiRoot.append(node);
    }
    if (aiReply) {
      const node = document.createElement('p');
      node.setAttribute('data-exercise-ai-reply', '');
      node.className =
        'mt-4 whitespace-pre-wrap border-t border-white/10 pt-4 text-sm leading-7 text-[#f4f0e8]';
      node.textContent = aiReply;
      aiRoot.append(node);
    }
  }

  function paint(): void {
    paintBusy();
    paintRun();
    paintAi();
  }

  function changeCode(): void {
    result = null;
    error = null;
    paint();
  }

  function reset(): void {
    editor.setCode(data!.starterCode);
    result = null;
    error = null;
    paint();
  }

  async function run(): Promise<void> {
    running = true;
    result = null;
    error = null;
    paint();
    try {
      const next = await judge(data!, editor.getCode());
      result = next;
      if (next.verdict.passed) markCompleted(data!.id);
    } catch (runError) {
      error = runError instanceof Error ? runError.message : String(runError);
    } finally {
      running = false;
      paint();
    }
  }

  /** AiCopilot.tsx 的 getError()：stderr || verdict.reason || ''。 */
  function currentError(): string {
    return result?.stderr || result?.verdict.reason || '';
  }

  async function ask(action: AiAction): Promise<void> {
    const status = aiStatus();
    aiLoading = action;
    aiReply = null;
    aiError = null;
    paintAi();
    try {
      const response = await request('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          exerciseId: data!.id,
          code: editor.getCode(),
          errorMsg: status === 'passed' ? undefined : currentError(),
          status,
        }),
      });
      const payload = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || payload.error) aiError = payload.error ?? '出错了';
      else aiReply = payload.reply ?? '';
    } catch {
      aiError = '网络错误，请重试';
    } finally {
      aiLoading = null;
      paintAi();
    }
  }

  const onRun = () => {
    void run();
  };
  const onReset = () => {
    reset();
  };
  const onAiClick = (event: Event) => {
    const target = (event.target as Element | null)?.closest<HTMLButtonElement>(
      '[data-exercise-ai-action]',
    );
    if (!target || target.disabled) return;
    const action = target.dataset.exerciseAiAction as AiAction | undefined;
    if (action) void ask(action);
  };

  runButton?.addEventListener('click', onRun);
  resetButton?.addEventListener('click', onReset);
  aiActions?.addEventListener('click', onAiClick);

  paint();

  return () => {
    runButton?.removeEventListener('click', onRun);
    resetButton?.removeEventListener('click', onReset);
    aiActions?.removeEventListener('click', onAiClick);
    editor.destroy();
    for (const node of Array.from(island.querySelectorAll('[data-exercise-dynamic]'))) node.remove();
    delete island.dataset.exerciseReady;
  };
}

mountExercise();
