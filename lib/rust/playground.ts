const PLAYGROUND_URL = 'https://play.rust-lang.org/execute';
const RUN_TIMEOUT_MS = 30_000;
const MIN_START_GAP_MS = 1_000;

export interface RunResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

export class PlaygroundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlaygroundError';
  }
}

let currentRun: Promise<RunResult> | null = null;
let lastStartedAt = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function execute(
  code: string,
  opts: { tests?: boolean; crateType?: 'bin' | 'lib' },
): Promise<RunResult> {
  const remainingGap = MIN_START_GAP_MS - (Date.now() - lastStartedAt);
  if (remainingGap > 0) await delay(remainingGap);
  lastStartedAt = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);

  try {
    const response = await fetch(PLAYGROUND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'stable',
        mode: 'debug',
        edition: '2024',
        crateType: opts.crateType ?? 'bin',
        tests: Boolean(opts.tests),
        code,
        backtrace: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new PlaygroundError('Playground 请求太频繁，请稍候几秒重试');
      }
      throw new PlaygroundError('Playground 暂时不可用，请稍候几秒重试');
    }

    const data = (await response.json()) as RunResult;
    return {
      success: data.success,
      stdout: data.stdout,
      stderr: data.stderr,
    };
  } catch (error) {
    if (error instanceof PlaygroundError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new PlaygroundError('运行超时，Playground 暂时不可用，请稍候几秒重试');
    }
    throw new PlaygroundError('Playground 暂时不可用，请稍候几秒重试');
  } finally {
    clearTimeout(timeout);
  }
}

export async function runOnPlayground(
  code: string,
  opts: { tests?: boolean; crateType?: 'bin' | 'lib' } = {},
): Promise<RunResult> {
  if (currentRun) {
    throw new PlaygroundError('上一个运行还未结束');
  }

  const run = execute(code, opts);
  currentRun = run;
  try {
    return await run;
  } finally {
    if (currentRun === run) currentRun = null;
  }
}

export function stripCargoNoise(stderr: string): string {
  const lines = stderr
    .split(/\r?\n/)
    .filter((line) => !/^(?:Compiling|Finished|Running)(?:\s|$)/.test(line.trimStart()));

  while (lines.length > 0 && lines.at(-1)?.trim() === '') lines.pop();
  return lines.join('\n');
}
