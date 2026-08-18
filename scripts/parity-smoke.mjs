#!/usr/bin/env node
// parity 冒烟：对 rust-dojo API 打一组无副作用请求，断言响应契约。
// 用法：node scripts/parity-smoke.mjs http://localhost:8788
//       node scripts/parity-smoke.mjs http://localhost:8788 --against https://rust-dojo.pp-account.workers.dev
//
// 单目标模式：逐条断言 status / body 深比较 / error 字符串全等 / clearsCookie（rdsess 的 Max-Age 严格为 0）。
// --against 模式：对两个目标发同样的请求并 diff——status、排序后的 JSON 键集合、
//                 error 字符串、Set-Cookie 的 (HttpOnly, Secure, SameSite, Path, Max-Age) 五属性。
// 任何 FAIL → 退出码 1。
//
// 矩阵只含无副作用请求：不发邮件（request-code 的两条都在参数校验阶段就返回），
// 不调 DeepSeek（ai 的两条都在参数校验阶段就返回），不写 D1（verify 用不存在的邮箱，
// 停在「请先获取验证码」）。
const CASES = [
  { name: 'me-unauth', method: 'GET', path: '/api/auth/me', expect: { status: 200, body: { user: null } } },
  { name: 'me-bad-cookie', method: 'GET', path: '/api/auth/me', headers: { cookie: 'rdsess=abc.def' }, expect: { status: 200, body: { user: null } } },
  { name: 'request-code-bad-json', method: 'POST', path: '/api/auth/request-code', raw: '{oops', expect: { status: 400, error: '请求格式错误' } },
  { name: 'request-code-bad-email', method: 'POST', path: '/api/auth/request-code', json: { email: 'nope' }, expect: { status: 400, error: '邮箱格式不对' } },
  { name: 'verify-bad-format', method: 'POST', path: '/api/auth/verify', json: { email: 'a@b.c', code: '12' }, expect: { status: 400, error: '邮箱或验证码格式不对' } },
  { name: 'verify-no-code', method: 'POST', path: '/api/auth/verify', json: { email: 'parity-nobody@example.com', code: '123456' }, expect: { status: 400, error: '请先获取验证码' } },
  { name: 'logout', method: 'POST', path: '/api/auth/logout', expect: { status: 200, body: { ok: true }, clearsCookie: true } },
  { name: 'progress-unauth', method: 'GET', path: '/api/progress', expect: { status: 401, error: '未登录' } },
  { name: 'progress-post-unauth', method: 'POST', path: '/api/progress', json: { exerciseId: 'm1-01' }, expect: { status: 401, error: '未登录' } },
  { name: 'sync-unauth', method: 'POST', path: '/api/progress/sync', json: { ids: ['m1-01'] }, expect: { status: 401, error: '未登录' } },
  { name: 'ai-bad-action', method: 'POST', path: '/api/ai', json: { action: 'nope' }, expect: { status: 400, error: '未知操作' } },
  { name: 'ai-empty-code', method: 'POST', path: '/api/ai', json: { action: 'debug', code: '' }, expect: { status: 400, error: '请先写点 Rust 代码' } },
];

const TIMEOUT_MS = 20_000;
const COOKIE_NAME = 'rdsess';

// ---------- 参数 ----------

function usage() {
  console.error('用法: node scripts/parity-smoke.mjs <baseUrl> [--against <baseUrl2>]');
}

function parseArgs(argv) {
  const positional = [];
  let against = '';
  let sawAgainst = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      usage();
      process.exit(0);
    } else if (arg === '--against') {
      against = argv[++i] ?? '';
      sawAgainst = true;
    } else if (arg.startsWith('--against=')) {
      against = arg.slice('--against='.length);
      sawAgainst = true;
    } else {
      positional.push(arg);
    }
  }
  // 传了 --against 但值为空（CI 里 `--against=$VAR` 而 VAR 未设）必须报错退出，
  // 绝不能静默降级成单目标模式——那会让「没在 diff」看起来像 PASS。
  if (sawAgainst && against.trim() === '') {
    console.error('--against 需要一个非空的 baseUrl');
    usage();
    process.exit(2);
  }
  if (positional.length !== 1) {
    usage();
    process.exit(2);
  }
  return { base: normalizeBase(positional[0]), against: sawAgainst ? normalizeBase(against.trim()) : null };
}

function normalizeBase(raw) {
  const value = raw.replace(/\/+$/, '');
  try {
    new URL(value);
  } catch {
    console.error(`无效的 baseUrl: ${raw}`);
    process.exit(2);
  }
  return value;
}

// ---------- 发请求 ----------

function buildInit(testCase) {
  const headers = { accept: 'application/json' };
  let body;
  if (testCase.raw !== undefined) {
    body = testCase.raw;
    headers['content-type'] = 'application/json';
  } else if (testCase.json !== undefined) {
    body = JSON.stringify(testCase.json);
    headers['content-type'] = 'application/json';
  }
  for (const [key, value] of Object.entries(testCase.headers ?? {})) {
    headers[key.toLowerCase()] = value;
  }
  return { method: testCase.method, headers, body, redirect: 'manual' };
}

// undici 从 Node 18.14 起有 Headers#getSetCookie；老版本只能拿到合并后的单串，
// 用「逗号后面紧跟 cookie-name=」这个特征切开（Expires 里的逗号后面是日期，不会误切）。
function readSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const merged = headers.get('set-cookie');
  if (!merged) return [];
  return merged.split(/,(?=\s*[^\s;=,]+\s*=)/g).map((s) => s.trim());
}

async function send(base, testCase) {
  const url = base + testCase.path;
  try {
    const res = await fetch(url, { ...buildInit(testCase), signal: AbortSignal.timeout(TIMEOUT_MS) });
    const text = await res.text();
    let json;
    let jsonOk = true;
    try {
      json = JSON.parse(text);
    } catch {
      jsonOk = false;
      json = undefined;
    }
    return {
      ok: true,
      url,
      status: res.status,
      contentType: res.headers.get('content-type') ?? '',
      text,
      json,
      jsonOk,
      setCookies: readSetCookies(res.headers),
    };
  } catch (e) {
    return { ok: false, url, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

// ---------- 工具 ----------

function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

function show(value) {
  return typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value ?? null);
}

function preview(text, max = 200) {
  const one = text.replace(/\s+/g, ' ').trim();
  return one.length > max ? one.slice(0, max) + '…' : one;
}

// Set-Cookie 单条 → { name, value, attrs }（attrs 键统一小写；布尔属性值为 true）
function parseSetCookie(line) {
  const parts = line.split(';');
  const first = parts.shift() ?? '';
  const eq = first.indexOf('=');
  const name = (eq === -1 ? first : first.slice(0, eq)).trim();
  const value = eq === -1 ? '' : first.slice(eq + 1).trim();
  const attrs = {};
  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;
    const i = p.indexOf('=');
    if (i === -1) attrs[p.toLowerCase()] = true;
    else attrs[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim();
  }
  return { name, value, attrs };
}

function hasAttr(cookie, name) {
  return Object.prototype.hasOwnProperty.call(cookie.attrs, name);
}

// 五属性指纹；SameSite 归一化成小写（Lax / lax 语义相同，不算 parity 差异）。
function cookieFingerprint(setCookies) {
  return setCookies
    .map(parseSetCookie)
    .map((c) => ({
      name: c.name,
      // 按属性键「是否出现」判断，不看值：`HttpOnly=x` 这类非规范写法浏览器同样视为置位，
      // 用 === true 比会把它当成缺失，从而在 diff 里造出假差异。
      HttpOnly: hasAttr(c, 'httponly'),
      Secure: hasAttr(c, 'secure'),
      SameSite: typeof c.attrs.samesite === 'string' ? c.attrs.samesite.toLowerCase() : null,
      Path: typeof c.attrs.path === 'string' ? c.attrs.path : null,
      'Max-Age': typeof c.attrs['max-age'] === 'string' ? Number(c.attrs['max-age']) : null,
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

// 递归键路径集合；数组只贡献一个 `[]` 段，长度不参与比较（比的是 JSON 形状/键集合）。
function keyPaths(value, prefix = '', out = new Set()) {
  if (Array.isArray(value)) {
    const p = prefix + '[]';
    out.add(p);
    for (const item of value) keyPaths(item, p, out);
  } else if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const p = prefix ? `${prefix}.${key}` : key;
      out.add(p);
      keyPaths(value[key], p, out);
    }
  }
  return out;
}

function sortedKeys(value) {
  return JSON.stringify([...keyPaths(value)].sort());
}

// ---------- 单目标断言 ----------

function assertCase(testCase, res) {
  const problems = [];
  const expect = testCase.expect ?? {};

  if (!res.ok) return [`请求失败: ${res.error}`];

  if (res.status !== expect.status) {
    problems.push(`status: 期望 ${expect.status}，实际 ${res.status}`);
  }

  const needsJson = expect.body !== undefined || expect.error !== undefined;
  if (needsJson && !res.jsonOk) {
    problems.push(`body 不是合法 JSON (content-type=${res.contentType || 'none'}): ${preview(res.text)}`);
  }

  if (expect.error !== undefined && res.jsonOk) {
    const actual = res.json && typeof res.json === 'object' ? res.json.error : undefined;
    if (actual !== expect.error) {
      problems.push(`error: 期望 ${show(expect.error)}，实际 ${show(actual)}`);
    }
  }

  if (expect.body !== undefined && res.jsonOk) {
    if (!deepEqual(res.json, expect.body)) {
      problems.push(`body: 期望 ${JSON.stringify(expect.body)}，实际 ${JSON.stringify(res.json)}`);
    }
  }

  if (expect.clearsCookie) {
    const cookies = res.setCookies.map(parseSetCookie).filter((c) => c.name === COOKIE_NAME);
    if (cookies.length === 0) {
      problems.push(
        `clearsCookie: set-cookie 里没有 ${COOKIE_NAME}=（实际 ${res.setCookies.length ? res.setCookies.join(' | ') : '无 set-cookie'}）`,
      );
    } else {
      // 契约收紧：Max-Age 属性值必须严格等于字符串 "0"。
      // 不接受 Number() 宽松转换（`Max-Age=-1`、`Max-Age=` 都会变成 <= 0 而误报 PASS），
      // 也不接受用过去的 Expires 顶替——清 session cookie 的唯一合法写法就是 Max-Age=0。
      const cleared = cookies.some((c) => c.attrs['max-age'] === '0');
      if (!cleared) {
        problems.push(`clearsCookie: ${COOKIE_NAME} 的 Max-Age 不是 "0"（实际 ${res.setCookies.join(' | ')}）`);
      }
    }
  }

  return problems;
}

// ---------- 双目标 diff ----------

function diffCase(a, b) {
  const problems = [];
  if (!a.ok) problems.push(`A 请求失败: ${a.error}`);
  if (!b.ok) problems.push(`B 请求失败: ${b.error}`);
  if (problems.length) return problems;

  if (a.status !== b.status) problems.push(`status: A=${a.status} B=${b.status}`);

  if (a.jsonOk !== b.jsonOk) {
    problems.push(
      `body 类型: A ${a.jsonOk ? 'JSON' : '非 JSON'} / B ${b.jsonOk ? 'JSON' : '非 JSON'}；A=${preview(a.text)} B=${preview(b.text)}`,
    );
  } else if (!a.jsonOk) {
    // 两边都不是 JSON：退化成正文全等比较。
    if (a.text.trim() !== b.text.trim()) {
      problems.push(`非 JSON 正文不一致: A=${preview(a.text)} B=${preview(b.text)}`);
    }
  } else {
    const ka = sortedKeys(a.json);
    const kb = sortedKeys(b.json);
    if (ka !== kb) problems.push(`JSON 键集合: A=${ka} B=${kb}`);

    const ea = a.json && typeof a.json === 'object' ? a.json.error : undefined;
    const eb = b.json && typeof b.json === 'object' ? b.json.error : undefined;
    if (ea !== eb) problems.push(`error: A=${show(ea)} B=${show(eb)}`);
  }

  const fa = cookieFingerprint(a.setCookies);
  const fb = cookieFingerprint(b.setCookies);
  if (fa.length !== fb.length) {
    problems.push(`set-cookie 条数: A=${fa.length} B=${fb.length}（A=${JSON.stringify(fa)} B=${JSON.stringify(fb)}）`);
  } else {
    for (let i = 0; i < fa.length; i++) {
      const x = fa[i];
      const y = fb[i];
      if (x.name !== y.name) {
        problems.push(`set-cookie[${i}] name: A=${x.name} B=${y.name}`);
        continue;
      }
      for (const attr of ['HttpOnly', 'Secure', 'SameSite', 'Path', 'Max-Age']) {
        if (x[attr] !== y[attr]) {
          problems.push(`set-cookie[${x.name}].${attr}: A=${show(x[attr])} B=${show(y[attr])}`);
        }
      }
    }
  }

  return problems;
}

// ---------- main ----------

function report(name, problems) {
  if (problems.length === 0) {
    console.log(`PASS  ${name}`);
    return true;
  }
  console.log(`FAIL  ${name}`);
  for (const p of problems) console.log(`        - ${p}`);
  return false;
}

async function main() {
  const { base, against } = parseArgs(process.argv.slice(2));
  let failed = 0;

  if (against) {
    console.log(`parity diff\n  A = ${base}\n  B = ${against}\n`);
    for (const testCase of CASES) {
      const [a, b] = await Promise.all([send(base, testCase), send(against, testCase)]);
      if (!report(testCase.name, diffCase(a, b))) failed++;
    }
  } else {
    console.log(`parity smoke\n  target = ${base}\n`);
    for (const testCase of CASES) {
      const res = await send(base, testCase);
      if (!report(testCase.name, assertCase(testCase, res))) failed++;
    }
  }

  const total = CASES.length;
  console.log(`\n${total - failed}/${total} PASS${failed ? `，${failed} FAIL` : ''}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('冒烟脚本自身异常：', e);
  process.exit(1);
});
