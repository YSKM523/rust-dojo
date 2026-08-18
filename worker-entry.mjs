// 薄入口：/api/* 与已迁移路径转发给 rust-dojo-api（service binding），其余透传 OpenNext handler。
// Phase B 渐进切流：迁移一批页面就在 MIGRATED 里加一条；回滚 = 删掉对应条目重部署。
// 条目语义：以 '/' 结尾 = 纯前缀匹配；否则 = 精确匹配或 "该路径 + /" 前缀匹配。
import handler from './.open-next/worker.js';
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

const MIGRATED = ['/resources', '/learn', '/project', '/assets/', '/icon.png', '/apple-icon.png'];

function isMigrated(pathname) {
  if (pathname.startsWith('/api/')) return true;
  for (const p of MIGRATED) {
    if (p.endsWith('/')) {
      if (pathname.startsWith(p)) return true;
    } else if (pathname === p || pathname.startsWith(p + '/')) {
      return true;
    }
  }
  return false;
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (isMigrated(pathname)) {
      return env.API.fetch(request);
    }
    return handler.fetch(request, env, ctx);
  },
};
