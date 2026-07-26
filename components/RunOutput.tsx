import type { JudgeResult } from '@/lib/rust/types';
import { normalizeStdout } from '@/lib/rust/normalize';

export function RunOutput({
  result,
  running,
}: {
  result: JudgeResult | null;
  running: boolean;
}) {
  if (!result) {
    return running ? (
      <p className="text-sm text-fg3">等待 Rust Playground 返回结果…</p>
    ) : null;
  }

  const showDiff =
    !result.verdict.passed &&
    result.expectedStdout !== undefined &&
    result.stdout !== undefined;
  const diffLine = showDiff
    ? findFirstDifferingLine(result.stdout ?? '', result.expectedStdout ?? '')
    : -1;

  return (
    <div className="space-y-4">
      <OutputBlock
        label="标准输出"
        content={result.stdout ?? ''}
        emptyLabel="（无标准输出）"
      />

      {result.stderr && <CompilerOutput stderr={result.stderr} />}

      {showDiff && (
        <div className="grid gap-4 sm:grid-cols-2">
          <DiffBlock
            label="期望输出"
            output={result.expectedStdout ?? ''}
            highlightedLine={diffLine}
          />
          <DiffBlock
            label="实际输出"
            output={result.stdout ?? ''}
            highlightedLine={diffLine}
          />
        </div>
      )}
    </div>
  );
}

function OutputBlock({
  label,
  content,
  emptyLabel,
}: {
  label: string;
  content: string;
  emptyLabel: string;
}) {
  return (
    <section aria-label={label} className="overflow-hidden border border-line bg-panel">
      <h3 className="border-b border-line bg-panel2 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-fg3">
        {label}
      </h3>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap px-3 py-3 font-mono text-sm leading-6 text-fg">
        {content || <span className="text-fg3">{emptyLabel}</span>}
      </pre>
    </section>
  );
}

function CompilerOutput({ stderr }: { stderr: string }) {
  return (
    <section aria-label="编译器信息" className="overflow-hidden border border-line bg-panel">
      <h3 className="border-b border-line bg-panel2 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-fg3">
        编译器信息
      </h3>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap px-3 py-3 font-mono text-sm leading-6 text-fg2">
        {stderr.split('\n').map((line, index) => (
          <span
            key={`${index}-${line}`}
            className={`block min-h-6 ${/^\s*error(?:\[[^\]]+\])?:/.test(line) ? 'text-bad' : ''}`}
          >
            {line || '\u00a0'}
          </span>
        ))}
      </pre>
    </section>
  );
}

function DiffBlock({
  label,
  output,
  highlightedLine,
}: {
  label: string;
  output: string;
  highlightedLine: number;
}) {
  const normalized = normalizeStdout(output);
  const lines = normalized === '' ? [''] : normalized.split('\n');

  return (
    <section aria-label={label} className="overflow-hidden border border-line bg-panel">
      <h3 className="border-b border-line bg-panel2 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-fg3">
        {label}
      </h3>
      <pre className="max-h-64 overflow-auto py-2 font-mono text-sm leading-6 text-fg">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const highlighted = lineNumber === highlightedLine;
          return (
            <span
              key={`${lineNumber}-${line}`}
              data-highlighted={highlighted ? 'true' : undefined}
              className={`block min-h-6 px-3 ${highlighted ? 'bg-bad-soft text-bad' : ''}`}
            >
              {line || '\u00a0'}
            </span>
          );
        })}
      </pre>
    </section>
  );
}

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
