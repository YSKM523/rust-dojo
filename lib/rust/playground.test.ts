import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('runOnPlayground', () => {
  it('posts the Rust 2024 request and returns the parsed result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          stdout: 'hello\n',
          stderr: '',
          exitDetail: 'success',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { runOnPlayground } = await import('./playground');

    await expect(
      runOnPlayground('fn main() {}', { tests: true, crateType: 'lib' }),
    ).resolves.toEqual({ success: true, stdout: 'hello\n', stderr: '' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://play.rust-lang.org/execute');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({
      channel: 'stable',
      mode: 'debug',
      edition: '2024',
      crateType: 'lib',
      tests: true,
      code: 'fn main() {}',
      backtrace: false,
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('turns a 503 response into a friendly PlaygroundError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    const { PlaygroundError, runOnPlayground } = await import('./playground');

    await expect(runOnPlayground('fn main() {}')).rejects.toMatchObject({
      name: PlaygroundError.name,
      message: 'Playground 暂时不可用，请稍候几秒重试',
    });
  });

  it('rejects a concurrent call while the first run is pending', async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const { runOnPlayground } = await import('./playground');

    const first = runOnPlayground('fn main() {}');
    await expect(runOnPlayground('fn main() {}')).rejects.toThrow('上一个运行还未结束');
    finish(
      new Response(JSON.stringify({ success: true, stdout: '', stderr: '' }), { status: 200 }),
    );
    await expect(first).resolves.toMatchObject({ success: true });
  });

  it('waits until one second after the previous start before posting again', async () => {
    vi.useFakeTimers({ now: 10_000 });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, stdout: '', stderr: '' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { runOnPlayground } = await import('./playground');

    await runOnPlayground('first');
    const second = runOnPlayground('second');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(second).resolves.toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('stripCargoNoise', () => {
  it('removes Cargo progress but keeps compiler warnings and trims blank lines', async () => {
    const { stripCargoNoise } = await import('./playground');
    const stderr = [
      '   Compiling playground v0.0.1 (/playground)',
      'warning: unused variable: `answer`',
      '  --> src/main.rs:2:9',
      '    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.42s',
      '     Running `target/debug/playground`',
      '',
      '  ',
    ].join('\n');

    expect(stripCargoNoise(stderr)).toBe(
      'warning: unused variable: `answer`\n  --> src/main.rs:2:9',
    );
  });
});
