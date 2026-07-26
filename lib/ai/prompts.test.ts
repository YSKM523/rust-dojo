import { describe, it, expect } from 'vitest';
import { buildMessages } from '@/lib/ai/prompts';

describe('buildMessages', () => {
  it('hint：系统提示强约束不给完整答案，用户消息带题面与 Rust 代码', () => {
    const msgs = buildMessages('hint', { title: 'T', prompt: 'P', code: 'fn main() {}' });
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('不要直接给出完整答案');
    expect(msgs[1].content).toContain('P');
    expect(msgs[1].content).toContain('fn main() {}');
  });

  it('hint：答案已通过时改为复盘语境，不再质疑结果', () => {
    const msgs = buildMessages('hint', {
      title: 'T',
      prompt: 'P',
      code: 'fn main() {}',
      status: 'passed',
    });
    expect(msgs[0].content).toContain('已经通过');
    expect(msgs[1].content).toContain('判题状态：passed');
  });

  it('explain：用户消息含被解释的 Rust 代码', () => {
    const msgs = buildMessages('explain', { code: 'fn main() {}' });
    expect(msgs[1].content).toContain('fn main() {}');
  });

  it('debug：用户消息含报错信息', () => {
    const msgs = buildMessages('debug', { code: 'fn main(', errorMsg: 'unclosed delimiter' });
    expect(msgs[1].content).toContain('unclosed delimiter');
  });
});
