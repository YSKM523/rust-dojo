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

const RUST_TUTOR_PERSONA =
  '你是一位耐心的 Rust 导师。始终使用简体中文，以苏格拉底式提问引导学员自己推导；不要直接给出完整答案或可直接提交的完整代码。' +
  '结合学员传入的代码与编译器信息解释所有权、借用、生命周期、trait、错误处理等相关概念；合适时鼓励查阅 Rust 标准库（std）官方文档。';

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
          `${RUST_TUTOR_PERSONA}${passedGuidance}` +
          '用 2-4 句给出简洁引导，优先提出一个能推动思考的问题。',
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
        content:
          `${RUST_TUTOR_PERSONA}` +
          '逐步、通俗地解释这段代码在做什么，并点明它涉及的 Rust 规则。简洁，不超过 6 句。',
      },
      { role: 'user', content: `解释这段 Rust 代码：\n${p.code}` },
    ];
  }
  return [
    {
      role: 'system',
      content:
        `${RUST_TUTOR_PERSONA}` +
        '学员的代码编译或运行失败了：先根据代码和 rustc 报错定位根因，再用问题与关键片段给出修复方向。简洁。',
    },
    { role: 'user', content: `Rust 代码：\n${p.code}\n\n报错信息：\n${p.errorMsg ?? '(无)'}` },
  ];
}
