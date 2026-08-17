import { getCompleted, setAll, setAuthed } from './store';
import { mergeIds } from './merge';

/** 应用加载时调一次：登录态则把本地 ids 与云端并集合并，写回本地缓存。 */
export async function bootstrapSync(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const session = await fetch('/api/auth/me');
    if (!session.ok) return;
    const sessionData = (await session.json()) as { user?: { email?: string } | null };
    if (!sessionData.user) {
      setAuthed(false);
      return;
    }

    const local = getCompleted();
    const res = await fetch('/api/progress/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: local }),
    });
    if (res.status === 401) {
      setAuthed(false);
      return; // 游客：保持纯本地
    }
    if (!res.ok) return;
    const data = (await res.json()) as { ids: string[] };
    setAuthed(true);
    // 与本地取并集，不要直接 setAll(data.ids)：
    // 服务端若因白名单漏放行某类 id（曾发生在项目验收清单 p1-xx 上），
    // 直接覆盖会把本地勾选清空。并集让客户端对服务端的过滤漂移免疫。
    setAll(mergeIds(local, data.ids));
  } catch {
    /* 离线：保留本地 */
  }
}
