export type AiAction = 'hint' | 'explain' | 'debug';
export type AiStatus = 'idle' | 'passed' | 'failed';

export interface AiPayload {
  title?: string;
  prompt?: string;
  code: string;
  errorMsg?: string;
  status?: AiStatus;
}

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export function buildMessages(action: AiAction, p: AiPayload): ChatMessage[] {
  if (action === 'hint') {
    const statusLine = `判题状态：${p.status ?? 'idle'}`;
    const passedGuidance =
      p.status === 'passed'
        ? '学员的答案已经通过。请复盘关键思路、指出这题训练的 Rust 概念，并给出下一题前的准备建议；不要质疑结果是否正确。'
        : '请给出循序渐进的提示：指出下一步该想什么、或哪里可能不对。';
    return [
      {
        role: 'system',
        content:
          `你是一位 Rust 导师。${passedGuidance}` +
          '绝对不要直接给出完整答案或可直接提交的完整代码。用中文，2-4 句，简洁。',
      },
      {
        role: 'user',
        content: `题目：${p.title ?? ''}\n要求：${p.prompt ?? ''}\n${statusLine}\n我目前写的 Rust 代码：\n${p.code || '(还没写)'}`,
      },
    ];
  }
  if (action === 'explain') {
    return [
      {
        role: 'system',
        content: '你是 Rust 导师。用中文逐步、通俗地解释给初学者这段 Rust 代码在做什么。简洁，不超过 6 句。',
      },
      { role: 'user', content: `解释这段 Rust 代码：\n${p.code}` },
    ];
  }
  return [
    {
      role: 'system',
      content:
        '你是 Rust 调试导师。学员的代码编译或运行失败了，用中文解释原因并给出修复方向。' +
        '可以给出关键片段，但不要直接写出整道题的完整答案。简洁。',
    },
    { role: 'user', content: `Rust 代码：\n${p.code}\n\n报错信息：\n${p.errorMsg ?? '(无)'}` },
  ];
}
