# Task 8 (B2) 报告：fx 动效层全量移植为 vanilla island

**状态**：完成。`islands/fx.ts` 从只有 Reveal 扩到六个动效；新增 `islands/fx.test.ts`（17 用例）。
**改动文件**：`islands/fx.ts`（重写）、`islands/fx.test.ts`（新增）。没有碰 `workers/api/**`、
`islands/login.ts`、`islands/me.ts`、`components/**`、`scripts/**`（构建脚本的 glob 约定原样够用，
fx.ts 已被自动收为入口）。

## 1. 结构决策

全部并进单文件 `islands/fx.ts`，没有拆 `_fx-*.ts`：六个动效之间只共享
`prefersReducedMotion()` / `els()` / `swapClasses()` 三个小工具，且没有第二个 island 需要它们，
拆出去只会多一个 shared chunk。产物 `assets-dist/assets/js/fx.js` 5 028 B（minified，无 react）。

`prefersReducedMotion()` 按 B0 既定做法**内联**而非 `import '@/components/fx/reducedMotion'`，
避免 B4 删 `components/` 时断链。语义与原文件逐字一致：一次性 `matchMedia(...).matches` 探测，
**不监听 change 事件**（原文件也没有），无 `window`/`matchMedia` 的环境返回 false。

挂载协议写在文件头注释里（约 130 行），六个动效各一节，含完整 DOM 骨架样例。Task 9 直接按它写模板。

协议总表：

| data-fx | 参数 / 子选择器 | 说明 |
|---|---|---|
| `reveal` | `data-fx-delay`（ms，缺省 0） | 元素 class 必带 `fx-reveal` |
| `count-up` | `data-fx-value`、`data-fx-suffix`、`data-fx-duration` | SSR 文本须为终值 |
| `hero-terminal` | `[data-fx-cmd]`、`[data-fx-line]`（可多个） | 光标 `.fx-caret` 由 island 建/删 |
| `magnetic` | 内层 `.fx-magnet` | 事件挂在外层，位移打在内层 |
| `marquee` | `.fx-marquee-track` | 动画纯 CSS；island 只做「只有一份行时补第二份」的幂等兜底 |
| `module-ladder` | `[data-fx-ladder-rows]` + 行上的 `data-fx-tier` / `-tier-class` / `-bar-class` / `-summary`；面板 `[data-fx-ladder-index|tier|summary|bar]` | 行 = 行容器的直接子元素 |

`module-ladder` 需要模板把 React 侧只存在于 state 的四份数据放到行元素上：tier 文案、
`TIER_COLORS[tierKey].text`（无 tierKey 用 `text-brand`）、`.bar`（无 tierKey 用 `bg-brand`）、summary，
与 `ModuleLadder.tsx` 的 `currentColor?.text ?? 'text-brand'` 同源。这两个 class 串必须是**完整静态类名**
（模板禁止拼接），Tailwind CLI 扫模板文本时能正常收到。

## 2. 参数逐项对照（React 原值 vs island 值）

### Reveal（`components/fx/Reveal.tsx`）— B0 已在，本次未改语义
| 项 | React | island | 等 |
|---|---|---|---|
| IO rootMargin | `'0px 0px -12% 0px'` | `'0px 0px -12% 0px'` | ✔ |
| IO threshold | `0.05` | `0.05` | ✔ |
| 命中动作 | `add('is-in')` + `io.disconnect()` | `add('is-in')` + `io.unobserve(target)` | ✔（React 一元素一 observer，island 一批共用一个 observer，unobserve 等价于「这个元素不再观察」） |
| delay 默认 | `delay = 0` | `Number(data-fx-delay ?? 0) || 0` | ✔ |
| `--fx-delay` 写法 | 总是写内联 style | 总是写内联 style | ✔ |
| 无 IO | `add('is-in')` | `add('is-in')` | ✔ |
| reduced-motion | 原组件**没有**分支 | island 多一条「reduced 直接 add('is-in')」 | **有意的既有差异**（B0 起即如此）：CSS 侧 `@media (prefers-reduced-motion: reduce)` 已把 `.fx-reveal` 的 opacity/transform/clip-path/transition 全 `!important` 复位，终态完全等价，只是少跑一个 observer。已在文件头显式记明。 |

### CountUp（`components/fx/CountUp.tsx`）
| 项 | React | island | 等 |
|---|---|---|---|
| IO threshold | `0.4` | `0.4`（`COUNT_UP_THRESHOLD`） | ✔ |
| duration 默认 | `900` | `900`（`COUNT_UP_DURATION`） | ✔ |
| duration 可覆写 | prop | `data-fx-duration` | ✔ |
| 起始渲染值 | `useState(value)` = 终值 | SSR 文本 = 终值，island 不动 | ✔ |
| 命中后第一步 | `setDisplay(0)` | `textContent = '0' + suffix` | ✔ |
| 计时基准 | `performance.now()` | `performance.now()` | ✔ |
| 进度 | `Math.min(1, (t - t0) / duration)` | 同式 | ✔ |
| easing | `1 - Math.pow(1 - p, 3)` | 同式 | ✔ |
| 取整 | `Math.round(value * eased)` | 同式 | ✔ |
| 续帧条件 | `if (p < 1) requestAnimationFrame(tick)` | 同 | ✔ |
| 只跑一次 | `started` ref + `io.disconnect()` | `started` 闭包 + `io.disconnect()` | ✔ |
| reduced-motion / 无 IO | 直接 `return`（停在终值） | 直接 `return`（停在终值） | ✔ |
| suffix 默认 | `''` | `''` | ✔ |

### HeroTerminal（`components/fx/HeroTerminal.tsx`）
| 项 | React | island | 等 |
|---|---|---|---|
| SSR 初值 | `typed=CMD, lineCount=2, done=true` | 模板渲染终态（全行可见、无光标） | ✔ |
| 会话键 | `sessionStorage 'rustdojo:boot'` | 同 | ✔ |
| 起手延迟 | `setTimeout(type, 250)` | `BOOT_START_DELAY = 250` | ✔ |
| 字符间隔 | `setTimeout(type, 26)` | `BOOT_TYPE_INTERVAL = 26` | ✔ |
| 第 1 行日志 | `180` | `BOOT_LINE1_DELAY = 180` | ✔ |
| 第 2 行日志 | `420` | `BOOT_LINE2_DELAY = 420` | ✔ |
| 收光标 | `900` | `BOOT_DONE_DELAY = 900` | ✔ |
| 打字切片 | `CMD.slice(0, i)`，i 从 1 起 | 同 | ✔ |
| 日志门控 | `LINES.slice(0, lineCount)`（未到的行不在 DOM） | 未到的行加 `hidden`（block 元素，视觉等价） | ✔ |
| 光标 | `<span class="fx-caret ml-0.5" aria-hidden>`，`!done` 时存在 | island 建同样的 span（`aria-hidden="true"`），`done` 时移除 | ✔ |
| CMD / LINES 文本 | 组件内常量 | 从 `[data-fx-cmd]`.textContent / `[data-fx-line]` 读，文本仍归模板 | ✔（内容不变，只是事实源从 TS 挪到模板） |
| 卸载 | `alive = false` | `alive = false` **+ clearTimeout** | ✔ 可观察等价（alive 已经拦住回调），多清一次定时器是为了不漏进下一个 vitest 用例 |
| sessionStorage 抛异常 | 不包 try/catch → effect 抛 → 不播、停终态 | try/catch，读失败当作 `seen='1'` → 不播、停终态 | ✔ 可观察等价 |
| reduced-motion | `return`（停终态、**不写** sessionStorage） | 同 | ✔ |

### Magnetic（`components/fx/Magnetic.tsx`）
| 项 | React | island | 等 |
|---|---|---|---|
| 事件 | `onPointerMove` / `onPointerLeave`（外层 span） | `pointermove` / `pointerleave`（`[data-fx="magnetic"]`） | ✔ |
| 指针闸 | `e.pointerType !== 'mouse'` return | 同 | ✔ |
| reduced-motion | `prefersReducedMotion()` return（每次移动都判） | 同（每次移动都判） | ✔ |
| 参照矩形 | `inner.getBoundingClientRect()` | 同（`.fx-magnet`） | ✔ |
| dx / dy | `clientX - (left + width/2)`、`clientY - (top + height/2)` | 同 | ✔ |
| 位移 | `translate((dx/w)*10px, (dy/h)*8px)` | `MAGNET_X_RANGE=10`、`MAGNET_Y_RANGE=8`，同式 | ✔ |
| 回弹 | `style.transform = ''` | 同 | ✔ |

### Marquee（`components/fx/Marquee.tsx`）
| 项 | React | island |
|---|---|---|
| 位移动画 | 纯 CSS `fx-marquee 36s linear infinite` → `translateX(-50%)` | 不碰（CSS 原样） |
| 内容份数 | 服务端渲染两份（第二份 `aria-hidden`） | 模板照渲两份；island 只在**只有一份**时克隆补齐并置 `aria-hidden="true"`，已两份则不动（幂等） |
| hover 暂停 | CSS `animation-play-state: paused` | 不碰 |
| reduced-motion | 组件无分支，CSS `animation: none !important` | 同（island 无分支） |

Marquee 在 React 侧是**服务端组件、零客户端 JS**，所以 island 侧没有可移植的时序参数；
`data-fx="marquee"` 保留在协议里是为了那条兜底克隆，Task 9 的模板逐节点照搬 `Marquee.tsx` 后它就是个 no-op。

### ModuleLadder（`components/fx/ModuleLadder.tsx`）
| 项 | React | island | 等 |
|---|---|---|---|
| IO threshold | `0` | `0` | ✔ |
| IO 观察目标 | `rowRefs.current[0]?.parentElement`（即 `<ol>`） | `[data-fx-ladder-rows]`（即同一个 `<ol>`） | ✔ |
| 进入视口 | `addEventListener('scroll', onScroll, {passive:true})` + `recompute()` | 同 | ✔ |
| 离开视口 | `removeEventListener('scroll', onScroll)` | 同 | ✔ |
| 节流 | `ticking` 布尔 + `requestAnimationFrame` | 同 | ✔ |
| 激活判据 | `|(rect.top+rect.bottom)/2 - window.innerHeight/2|` 最小 | 同式 | ✔ |
| 同值不重渲染 | `setActive(best)` React 自身短路 | `if (best === active) return` | ✔ |
| 序号 | `String(active+1).padStart(2,'0')` | 同 | ✔ |
| 进度条宽 | `((active+1)/rows.length)*100 + '%'` | 同式 | ✔ |
| 行状态 | `data-active={index === active}` | `setAttribute('data-active', String(index === active))` | ✔ |
| 层级色 / 条色 | `currentColor?.text ?? 'text-brand'`、`?.bar ?? 'bg-brand'` | 行上的 `data-fx-tier-class` / `data-fx-bar-class`（模板用同一套 `TIER_COLORS` 求值），整串换类 | ✔ |
| 无 IO | 直接 `return`（静止在 active=0） | 同 | ✔ |
| reduced-motion | 组件**无**分支 | island 也无分支（行对比度交给 CSS media query） | ✔ |

## 3. 验证

### 3.1 `npm run assets` 自检（Node 22.22.2）
```
[assets] js: checklist.js, fx.js, logout.js, progress-badge.js, progress-sync.js, theme.js (+1 shared chunk)
  PASS  js/fx.js 存在
  PASS  js/fx.js 无 react  (5028 B)
[assets] self-check: 26/26 passed
```

### 3.2 vitest
- `npx vitest run islands/fx.test.ts` → **17 passed**
- `npx vitest run`（全量）→ **Test Files 44 passed | 1 skipped，Tests 179 passed | 61 skipped**
- `npx tsc --noEmit`、`npx eslint islands/fx.ts islands/fx.test.ts` → 无输出

`islands/fx.test.ts` 跑法与 `islands/progress-badge.test.ts` 对齐（文件首行 `// @vitest-environment jsdom`，
走仓库根 `vitest.config.ts`）。自带一个可手动触发的 `FakeIntersectionObserver`（jsdom 没有），
外加可控的 `requestAnimationFrame` 队列与 `performance.now`，用来一帧帧检查数值推进。覆盖：
CountUp（ease-out 逐帧数值 `0+ → 53+ → 60+`、threshold 0.4、reduced-motion 直达终值、无 IO 环境）、
HeroTerminal（挂载即清空+挂光标+隐藏日志行、逐字、180/420/900 三段、会话已播过则停终态、reduced-motion 停终态）、
Marquee（补 aria-hidden 副本、幂等、挂载不抛）、Reveal（is-in + `--fx-delay`）、
Magnetic（`translate(5px, 4px)` 精确值、触摸不动、reduced 不动）、
ModuleLadder（激活行切换 + 面板四项同步、scroll rAF 节流只排一帧、卸载后不响应、IO 离开摘监听）。

### 3.3 真浏览器 fixture（playwright + chromium-1179，`--no-sandbox`）
临时 fixture 手挂全部六个动效（放 `assets-dist/`，全目录 gitignore，跑完已删；探针脚本在 scratchpad，不进仓）。
本地静态服务器挂 `assets-dist/`，加载真产物 `/assets/js/fx.js` + `/assets/site.css`，`<html class="fx-js">`。

```
PASS  hero-terminal 打字推进  t=80ms '' -> t=480ms '$ cargo run -' -> t=2s '$ cargo run --release --jd 2026'
PASS  hero-terminal 光标 + 日志行门控  caret 1->0, hidden lines 2->0
PASS  marquee 位移  translateX -8.75px -> -11.30px（600ms），track 子节点 2
PASS  magnetic 跟随指针  hover -> 'translate(4.68758px, 3.33333px)'（上限 5px/4px），leave -> ''
PASS  reveal 类切换  is-in (False, False) -> (True, True), #rev-a opacity=1
PASS  count-up 数值变化  进视口前 '61+' -> 采样 ['61+', '18+', '36+', '47+', '54+', '59+', '60+', '61+', '61+'] -> 终值 '61+' / '8'
PASS  module-ladder 阶梯类切换
        起点 {"active": ["true","false","false"], "index": "01", "tier": "入门", "tierClass": "… text-emerald-700 dark:text-emerald-400", "summary": "变量、控制流、move、借用与切片。", "bar": "33.3333%", "barClass": "h-px bg-emerald-600 transition-all duration-500", "op": ["1","0.28","0.28"]}
        滚到第三行 {"active": ["false","false","true"], "index": "03", "tier": "高级", "tierClass": "… text-violet-700 dark:text-violet-400", "summary": "写得出抽象层：约束、分发方式与借用标注。", "bar": "100%", "barClass": "h-px transition-all duration-500 bg-violet-600", "op": ["0.28","0.28","1"]}

[fx-probe] 7/7 passed
```

同一 fixture 再跑一遍 `reduced_motion="reduce"` 的 context，验证 reduced 分支在真浏览器里也成立：

```
PASS  reduced: hero-terminal 停在终态  cmd 终态 / 无光标 / 未写 sessionStorage
PASS  reduced: count-up 直达终值  始终 '61+'，无归零
PASS  reduced: reveal 立即可见  is-in + opacity 1
PASS  reduced: magnetic 不位移  transform 空串
PASS  reduced: marquee 由 CSS 停住（island 无分支）  animation-name: none

[fx-probe-reduced] 5/5 passed
```

`op: ["1","0.28","0.28"]` 是 `.fx-ladder-row[data-active]` 的 CSS 生效证据（lg 断点下非激活行 0.28），
说明 island 只改 `data-active`、明暗完全交给 CSS 这条分工是通的。

## 4. 交给 Task 9 的注意事项

1. `base.html` 现在**还没有** `<script type="module" src="/assets/js/fx.js">`。首页模板落地时要加（`workers/api/**`
   本任务不许碰，已留给 Task 9）。注意 `base.html` 的 head 内联脚本已经在给 `<html>` 加 `fx-js`，
   也就是说**只要模板出现 `.fx-reveal` 而 fx.js 没加载，那些元素会永久不可见**。
2. `[data-fx-cmd]` 的 textContent 就是要打的字，模板不得在标签与文本之间塞换行/缩进。
3. `hero` 区的 `.fx-hero-item` 级联是纯 CSS（`--fx-delay` 内联 style），不归 fx island 管，照 `app/page.tsx` 写即可。
4. `module-ladder` 的 sticky 面板序号需要一个 `[data-fx-ladder-index]` 的 `<span>` 包住那两位数字
   ——`ModuleLadder.tsx` 里它是裸文本节点。这是本次移植唯一新增的 DOM 节点，行内 `<span>` 无样式，像素中性。
5. `count-up` 的 SSR 文本必须已经是 `${value}${suffix}`，否则无 JS / reduced-motion 下会显示错值。

## 5. 未解决 / 疑虑

- Reveal 的 reduced-motion 短路是 island 相对 `Reveal.tsx` 的既有（B0 起）差异，终态等价，本次沿用未改。
  若后续要求逐行等价，删掉 `mountReveal` 里的 `|| prefersReducedMotion()` 即可，测试会红一条。
- `marquee` island 在模板逐节点照搬 `Marquee.tsx` 后是 no-op；保留它是为了协议完整 + 防御模板只写一份行内容。
