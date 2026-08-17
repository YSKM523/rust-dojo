import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from './types';
import { runOnPlayground } from './playground';
import { judgeExercise } from './judge';

vi.mock('./playground', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./playground')>();
  return { ...actual, runOnPlayground: vi.fn() };
});

const runMock = vi.mocked(runOnPlayground);

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'm1-01',
    moduleId: 'm1',
    title: '测试题',
    difficulty: 1,
    prompt: '完成代码',
    starterCode: 'fn main() {}',
    solutionCode: 'fn main() {}',
    judgeMode: 'stdout',
    expectedStdout: 'alpha\nbeta',
    ...overrides,
  };
}

beforeEach(() => {
  runMock.mockReset();
});

describe('judgeExercise stdout mode', () => {
  it('passes normalized matching output', async () => {
    runMock.mockResolvedValue({ success: true, stdout: 'alpha  \r\nbeta\r\n\r\n', stderr: '' });

    const result = await judgeExercise(exercise(), 'fn main() {}');

    expect(result.verdict).toEqual({ passed: true });
    expect(result.stdout).toBe('alpha  \r\nbeta\r\n\r\n');
    expect(runMock).toHaveBeenCalledWith('fn main() {}', { crateType: 'bin' });
  });

  it('reports the first differing line and includes both outputs', async () => {
    runMock.mockResolvedValue({ success: true, stdout: 'alpha\nwrong\nthird\n', stderr: '' });

    const result = await judgeExercise(
      exercise({ expectedStdout: 'alpha\nbeta\nthird\n' }),
      'fn main() {}',
    );

    expect(result).toMatchObject({
      verdict: { passed: false, reason: '输出不符：第 2 行开始与期望不同' },
      stdout: 'alpha\nwrong\nthird\n',
      expectedStdout: 'alpha\nbeta\nthird\n',
    });
  });

  it('uses the first extra line when one output is a common-prefix extension', async () => {
    runMock.mockResolvedValue({ success: true, stdout: 'alpha\nbeta\nextra', stderr: '' });

    const result = await judgeExercise(exercise(), 'fn main() {}');

    expect(result.verdict.reason).toBe('输出不符：第 3 行开始与期望不同');
  });

  it('returns cleaned diagnostics when compilation or execution fails', async () => {
    runMock.mockResolvedValue({
      success: false,
      stdout: '',
      stderr: '   Compiling playground v0.0.1\nerror: expected `;`\n\n',
    });

    const result = await judgeExercise(exercise(), 'broken');

    expect(result).toEqual({
      verdict: { passed: false, reason: '编译或运行失败' },
      stdout: '',
      stderr: 'error: expected `;`',
    });
  });
});

describe('judgeExercise compile mode', () => {
  it('passes successful compilation with the configured crate type', async () => {
    runMock.mockResolvedValue({ success: true, stdout: '', stderr: '' });

    const result = await judgeExercise(
      exercise({ judgeMode: 'compile', expectedStdout: undefined, crateType: 'lib' }),
      'pub fn answer() {}',
    );

    expect(result.verdict).toEqual({ passed: true });
    expect(runMock).toHaveBeenCalledWith('pub fn answer() {}', { crateType: 'lib' });
  });

  it('fails unsuccessful compilation and cleans Cargo progress', async () => {
    runMock.mockResolvedValue({
      success: false,
      stdout: '',
      stderr: 'Finished `dev`\nerror[E0382]: borrow of moved value\n',
    });

    const result = await judgeExercise(
      exercise({ judgeMode: 'compile', expectedStdout: undefined }),
      'broken',
    );

    expect(result).toMatchObject({
      verdict: { passed: false, reason: '编译或运行未通过' },
      stderr: 'error[E0382]: borrow of moved value',
    });
  });
});

describe('judgeExercise tests mode', () => {
  const hiddenTests = '#[cfg(test)] mod tests { /* secret assertion */ }';

  it('appends hidden tests and passes a successful test run', async () => {
    runMock.mockResolvedValue({
      success: true,
      stdout: 'test result: ok. 1 passed\n',
      stderr: 'Finished `test` profile\n',
    });

    const result = await judgeExercise(
      exercise({
        judgeMode: 'tests',
        expectedStdout: undefined,
        hiddenTests,
      }),
      'pub fn answer() -> i32 { 42 }',
    );

    expect(runMock).toHaveBeenCalledWith(
      `pub fn answer() -> i32 { 42 }\n\n${hiddenTests}`,
      { tests: true, crateType: 'lib' },
    );
    expect(result.verdict).toEqual({ passed: true });
    expect(JSON.stringify(result)).not.toContain(hiddenTests);
  });

  it('fails hidden tests while passing through the cleaned report', async () => {
    runMock.mockResolvedValue({
      success: false,
      stdout: 'test tests::answer ... FAILED\n',
      stderr: 'Running unittests src/lib.rs\nerror: test failed\n',
    });

    const result = await judgeExercise(
      exercise({
        judgeMode: 'tests',
        expectedStdout: undefined,
        hiddenTests,
        crateType: 'bin',
      }),
      'fn answer() -> i32 { 0 }',
    );

    expect(result).toEqual({
      verdict: { passed: false, reason: '隐藏测试未通过' },
      stdout: 'test tests::answer ... FAILED\n',
      stderr: 'error: test failed',
    });
    expect(runMock).toHaveBeenCalledWith(expect.stringContaining(hiddenTests), {
      tests: true,
      crateType: 'bin',
    });
    expect(JSON.stringify(result)).not.toContain(hiddenTests);
  });

  it('redacts hidden test source if a compiler diagnostic echoes it', async () => {
    const multilineHiddenTests = [
      '#[cfg(test)]',
      'mod tests {',
      '    assert_eq!(answer(), 42);',
      '}',
    ].join('\n');
    runMock.mockResolvedValue({
      success: false,
      stdout: `test failed\n${multilineHiddenTests}`,
      stderr: 'error: hidden test did not compile\n8 | assert_eq!(answer(), 42);\n',
    });

    const result = await judgeExercise(
      exercise({
        judgeMode: 'tests',
        expectedStdout: undefined,
        hiddenTests: multilineHiddenTests,
      }),
      'pub fn answer() -> i32 { 0 }',
    );

    expect(JSON.stringify(result)).not.toContain(multilineHiddenTests);
    expect(result.stderr).not.toContain('assert_eq!(answer(), 42);');
    expect(result.stdout).toContain('test failed');
  });
});

describe('judgeExercise compile mode 加固', () => {
  // 回归：compile 题曾只判 run.success，学员删光逻辑只留 `fn main() {}` 也能过。
  it('带 expectedStdout 时同时比对输出，空 main 判不过', async () => {
    runMock.mockResolvedValue({ success: true, stdout: '', stderr: '' });

    const result = await judgeExercise(
      exercise({ judgeMode: 'compile', expectedStdout: 'alpha\nbeta\n' }),
      'fn main() {}',
    );

    expect(result.verdict.passed).toBe(false);
    expect(result.verdict.reason).toContain('输出不符');
    expect(result.expectedStdout).toBe('alpha\nbeta\n');
  });

  it('带 expectedStdout 且输出一致时判过', async () => {
    runMock.mockResolvedValue({ success: true, stdout: 'alpha\nbeta\n', stderr: '' });

    const result = await judgeExercise(
      exercise({ judgeMode: 'compile', expectedStdout: 'alpha\nbeta\n' }),
      'fn main() { /* ... */ }',
    );

    expect(result.verdict).toEqual({ passed: true });
  });

  it('不带 expectedStdout 时维持"只要能编译运行"的旧语义', async () => {
    runMock.mockResolvedValue({ success: true, stdout: '随便什么输出\n', stderr: '' });

    const result = await judgeExercise(
      exercise({ judgeMode: 'compile', expectedStdout: undefined }),
      'fn main() {}',
    );

    expect(result.verdict).toEqual({ passed: true });
  });

  it('编译失败时给 compile 专属的 reason', async () => {
    runMock.mockResolvedValue({ success: false, stdout: '', stderr: 'error[E0382]: ...' });

    const result = await judgeExercise(
      exercise({ judgeMode: 'compile', expectedStdout: 'alpha\n' }),
      'fn main() {}',
    );

    expect(result.verdict).toEqual({ passed: false, reason: '编译或运行未通过' });
  });
});

describe('judgeExercise assertSource', () => {
  it('把编译期断言追加到提交代码末尾', async () => {
    runMock.mockResolvedValue({ success: true, stdout: '', stderr: '' });

    await judgeExercise(
      exercise({ judgeMode: 'compile', expectedStdout: undefined, assertSource: 'const _X: fn() = f;' }),
      'fn main() {}',
    );

    expect(runMock).toHaveBeenCalledWith('fn main() {}\n\nconst _X: fn() = f;\n', {
      crateType: 'bin',
    });
  });

  it('没有 assertSource 时原样提交', async () => {
    runMock.mockResolvedValue({ success: true, stdout: 'alpha\nbeta', stderr: '' });

    await judgeExercise(exercise(), 'fn main() {}');

    expect(runMock).toHaveBeenCalledWith('fn main() {}', { crateType: 'bin' });
  });

  it('assertSource 只有空白时不追加', async () => {
    runMock.mockResolvedValue({ success: true, stdout: 'alpha\nbeta', stderr: '' });

    await judgeExercise(exercise({ assertSource: '   \n  ' }), 'fn main() {}');

    expect(runMock).toHaveBeenCalledWith('fn main() {}', { crateType: 'bin' });
  });
});
