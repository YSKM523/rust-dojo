import { getCloudflareContext } from '@opennextjs/cloudflare';
import { buildMessages, type AiAction, type AiStatus } from '@/lib/ai/prompts';
import { askDeepSeek } from '@/lib/ai/deepseek';
import { checkRateLimit } from '@/lib/ai/ratelimit';
import { getExerciseById } from '@/content/exercises';

const ACTIONS: AiAction[] = ['hint', 'explain', 'debug'];
const STATUSES: AiStatus[] = ['idle', 'passed', 'failed'];
const DAILY_LIMIT = 40;

export async function POST(req: Request) {
  let body: {
    action?: string;
    exerciseId?: string;
    code?: string;
    errorMsg?: string;
    status?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 });
  }

  const action = body.action as AiAction;
  if (!ACTIONS.includes(action)) {
    return Response.json({ error: '未知操作' }, { status: 400 });
  }
  if (action !== 'hint' && !body.code?.trim()) {
    return Response.json({ error: '请先写点 Rust 代码' }, { status: 400 });
  }
  const status = STATUSES.includes(body.status as AiStatus) ? (body.status as AiStatus) : 'idle';

  const { env } = getCloudflareContext();
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI 暂未配置' }, { status: 503 });
  }

  if (env.AI_RATELIMIT) {
    const ip = req.headers.get('cf-connecting-ip') ?? 'anon';
    const day = new Date().toISOString().slice(0, 10);
    const rl = await checkRateLimit(env.AI_RATELIMIT, ip, day, DAILY_LIMIT);
    if (!rl.allowed) {
      return Response.json({ error: '今天的 AI 次数用完了，明天再来吧' }, { status: 429 });
    }
  }

  const ex = body.exerciseId ? getExerciseById(body.exerciseId) : undefined;
  const messages = buildMessages(action, {
    title: ex?.title,
    prompt: ex?.prompt,
    code: body.code ?? '',
    errorMsg: body.errorMsg,
    status,
  });

  try {
    const reply = await askDeepSeek(messages, {
      apiKey,
      model: env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
    });
    return Response.json({ reply });
  } catch (e) {
    return Response.json(
      { error: 'AI 调用失败：' + (e instanceof Error ? e.message : String(e)) },
      { status: 502 },
    );
  }
}
