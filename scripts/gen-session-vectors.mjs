#!/usr/bin/env node
// 用现役 TS 实现生成会话验签测试向量，Rust core::session 必须逐条复现结果。
import * as esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = await esbuild.build({
  entryPoints: [path.join(ROOT, 'lib/auth/session.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'node20',
  alias: { '@': ROOT },
});
const { signSession } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
);

const SECRET = 'test-secret-0123456789abcdef';
const NOW = 1755400000000; // 固定时钟，向量可复现
const payload = { uid: 'u-123', email: 'dojo@example.com', exp: NOW + 86_400_000 };
// 中文邮箱域名测非 ASCII 路径（b64url 前经 TextEncoder UTF-8）
const cjkPayload = { uid: 'u-中文', email: '道场@example.com', exp: NOW + 86_400_000 };

const valid = await signSession(payload, SECRET);
const cjk = await signSession(cjkPayload, SECRET);
const expired = await signSession({ ...payload, exp: NOW - 1000 }, SECRET);
const wrongSecret = await signSession(payload, 'another-secret');
const [p, sig] = valid.split('.');
const tampered = `${p}.${sig.slice(0, -2)}${sig.endsWith('AA') ? 'BB' : 'AA'}`;
const badPayload = `${Buffer.from('not-json').toString('base64url')}.${sig}`;

const vectors = [
  { name: 'valid', token: valid, secret: SECRET, now: NOW, expect: payload },
  { name: 'valid-cjk-utf8', token: cjk, secret: SECRET, now: NOW, expect: cjkPayload },
  { name: 'expired', token: expired, secret: SECRET, now: NOW, expect: null },
  { name: 'exp-boundary-equal-now', token: await signSession({ ...payload, exp: NOW }, SECRET), secret: SECRET, now: NOW, expect: null },
  { name: 'wrong-secret', token: wrongSecret, secret: SECRET, now: NOW, expect: null },
  { name: 'tampered-sig', token: tampered, secret: SECRET, now: NOW, expect: null },
  { name: 'bad-payload-json', token: badPayload, secret: SECRET, now: NOW, expect: null },
  { name: 'no-dot', token: 'nodotatall', secret: SECRET, now: NOW, expect: null },
  { name: 'empty', token: '', secret: SECRET, now: NOW, expect: null },
];

const out = path.join(ROOT, 'workers/api/tests/fixtures/session-vectors.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(vectors, null, 1) + '\n');
console.log(`${vectors.length} vectors written`);
