import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readSession } from '@/lib/auth/cookie';
import { mergeProgress } from '@/lib/db/d1';
import { filterKnownProgressIds } from '@/lib/progress/ids';

export async function POST(req: NextRequest) {
  const { env } = getCloudflareContext();
  if (!env.DB || !env.SESSION_SECRET) {
    return NextResponse.json({ error: '未配置' }, { status: 503 });
  }
  const s = await readSession(req, env.SESSION_SECRET);
  if (!s) return NextResponse.json({ error: '未登录' }, { status: 401 });
  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  // 练习 id 与项目验收清单 id 共用进度命名空间，两者都要放行：
  // 只放行练习会让 p1-xx 被丢弃，客户端拿回结果后 setAll 会把本地清单勾选清空。
  const ids = filterKnownProgressIds(body.ids);
  const merged = await mergeProgress(env.DB, s.uid, ids, Date.now());
  return NextResponse.json({ ids: merged });
}
