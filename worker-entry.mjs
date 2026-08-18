// 薄入口：/api/* 转发给 rust-dojo-api（service binding），其余透传 OpenNext handler。
// 回滚 = wrangler.jsonc 的 main 改回 .open-next/worker.js 并删掉 API binding。
import handler from './.open-next/worker.js';
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) {
      return env.API.fetch(request);
    }
    return handler.fetch(request, env, ctx);
  },
};
