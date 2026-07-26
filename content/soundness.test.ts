import { describe, expect, it, vi } from 'vitest';
import { allExercises } from '@/content/exercises';

/**
 * 内容"正确性"实测：真的把每道题的参考答案送到 Rust Playground 上编译运行。
 * 默认跳过（走网络、慢），只有 PLAYGROUND_TESTS=1 时才跑：`npm run test:soundness`。
 *
 * 这里直接 fetch Playground，不复用 lib/rust/playground.ts —— 判题层出 bug 时
 * 这套测试仍然要能独立指出"内容错了还是判题错了"。
 */

const PLAYGROUND_URL = 'https://play.rust-lang.org/execute';
const MIN_INTERVAL_MS = 1200;
const TIMEOUT_MS = 90_000;

vi.setConfig({ testTimeout: TIMEOUT_MS, hookTimeout: TIMEOUT_MS });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let lastCallAt = 0;

interface PlaygroundResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

async function runOnPlayground(
  code: string,
  { tests = false, crateType = 'bin' }: { tests?: boolean; crateType?: 'bin' | 'lib' } = {},
): Promise<PlaygroundResult> {
  const waitFor = MIN_INTERVAL_MS - (Date.now() - lastCallAt);
  if (waitFor > 0) await sleep(waitFor);
  lastCallAt = Date.now();

  const response = await fetch(PLAYGROUND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'stable',
      mode: 'debug',
      edition: '2024',
      crateType,
      tests,
      code,
      backtrace: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Playground HTTP ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as PlaygroundResult;
}

/** 与判题层一致：逐行去尾空格，去掉末尾空行。 */
function normalizeStdout(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

const stdoutExercises = allExercises.filter((exercise) => exercise.judgeMode === 'stdout');
const compileExercises = allExercises.filter((exercise) => exercise.judgeMode === 'compile');
const testsExercises = allExercises.filter((exercise) => exercise.judgeMode === 'tests');

describe.skipIf(!process.env.PLAYGROUND_TESTS)('exercise soundness (Rust Playground 实测)', () => {
  it('内容里至少有一道题可测', () => {
    expect(allExercises.length).toBeGreaterThan(0);
  });

  for (const exercise of stdoutExercises) {
    it(`[stdout] ${exercise.id} 参考答案输出与 expectedStdout 一致`, async () => {
      const result = await runOnPlayground(exercise.solutionCode, {
        tests: false,
        crateType: exercise.crateType ?? 'bin',
      });
      expect(result.success, `${exercise.id} 编译/运行失败:\n${result.stderr}`).toBe(true);
      expect(normalizeStdout(result.stdout)).toBe(normalizeStdout(exercise.expectedStdout ?? ''));
    });
  }

  for (const exercise of compileExercises) {
    it(`[compile] ${exercise.id} 参考答案编译通过、starterCode 必须编译失败`, async () => {
      const solution = await runOnPlayground(exercise.solutionCode, {
        tests: false,
        crateType: exercise.crateType ?? 'bin',
      });
      expect(solution.success, `${exercise.id} 参考答案没通过:\n${solution.stderr}`).toBe(true);

      const starter = await runOnPlayground(exercise.starterCode, {
        tests: false,
        crateType: exercise.crateType ?? 'bin',
      });
      expect(starter.success, `${exercise.id} 的 starterCode 竟然编译通过了，这题就没得修了`).toBe(
        false,
      );
    });
  }

  for (const exercise of testsExercises) {
    it(`[tests] ${exercise.id} 参考答案通过全部隐藏测试`, async () => {
      const code = `${exercise.solutionCode}\n\n${exercise.hiddenTests ?? ''}\n`;
      const result = await runOnPlayground(code, {
        tests: true,
        crateType: exercise.crateType ?? 'lib',
      });
      expect(result.success, `${exercise.id} 隐藏测试没过:\n${result.stdout}\n${result.stderr}`).toBe(
        true,
      );
    });
  }
});
