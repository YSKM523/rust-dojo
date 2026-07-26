import { normalizeStdout } from './normalize';
import { runOnPlayground, stripCargoNoise } from './playground';
import type { Exercise, JudgeResult } from './types';

function outputLines(output: string): string[] {
  return output === '' ? [] : output.split('\n');
}

function firstDifferingLine(actual: string, expected: string): number {
  const actualLines = outputLines(actual);
  const expectedLines = outputLines(expected);
  const commonLength = Math.min(actualLines.length, expectedLines.length);

  for (let index = 0; index < commonLength; index += 1) {
    if (actualLines[index] !== expectedLines[index]) return index + 1;
  }
  return commonLength + 1;
}

function redactHiddenTestSource(output: string, hiddenTests: string): string {
  if (!hiddenTests) return output;

  let redacted = output.replaceAll(hiddenTests, '[隐藏测试代码已省略]');
  const sourceFragments = Array.from(
    new Set(
      hiddenTests
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length >= 4),
    ),
  ).sort((left, right) => right.length - left.length);

  for (const fragment of sourceFragments) {
    redacted = redacted.replaceAll(fragment, '[隐藏测试代码已省略]');
  }
  return redacted;
}

export async function judgeExercise(ex: Exercise, userCode: string): Promise<JudgeResult> {
  if (ex.judgeMode === 'tests') {
    const hiddenTests = ex.hiddenTests ?? '';
    const submittedCode = `${userCode}\n\n${hiddenTests}`;
    const run = await runOnPlayground(submittedCode, {
      tests: true,
      crateType: ex.crateType ?? 'lib',
    });
    const stdout = redactHiddenTestSource(run.stdout, hiddenTests);
    const stderr = redactHiddenTestSource(stripCargoNoise(run.stderr), hiddenTests);

    return {
      verdict: run.success
        ? { passed: true }
        : { passed: false, reason: '隐藏测试未通过' },
      stdout,
      stderr,
    };
  }

  const run = await runOnPlayground(userCode, {
    crateType: ex.crateType ?? 'bin',
  });
  const stderr = stripCargoNoise(run.stderr);

  if (ex.judgeMode === 'compile') {
    return {
      verdict: run.success
        ? { passed: true }
        : { passed: false, reason: '编译或运行未通过' },
      stdout: run.stdout,
      stderr,
    };
  }

  if (!run.success) {
    return {
      verdict: { passed: false, reason: '编译或运行失败' },
      stdout: run.stdout,
      stderr,
    };
  }

  const expectedStdout = ex.expectedStdout ?? '';
  const actualNormalized = normalizeStdout(run.stdout);
  const expectedNormalized = normalizeStdout(expectedStdout);
  if (actualNormalized === expectedNormalized) {
    return {
      verdict: { passed: true },
      stdout: run.stdout,
      stderr,
    };
  }

  const line = firstDifferingLine(actualNormalized, expectedNormalized);
  return {
    verdict: {
      passed: false,
      reason: `输出不符：第 ${line} 行开始与期望不同`,
    },
    stdout: run.stdout,
    stderr,
    expectedStdout,
  };
}
