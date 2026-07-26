import type { TierKey } from '@/lib/rust/types';

/**
 * 层级 → 颜色系统（全站统一）：徽章 / 文本强调 / 进度条。
 * 完整静态类名（Tailwind 不支持动态拼接）；text 带 dark: 变体保证双主题对比度。
 */
export const TIER_COLORS: Record<
  TierKey,
  { badge: string; text: string; bar: string }
> = {
  beginner: {
    badge: 'bg-emerald-700 text-white',
    text: 'text-emerald-700 dark:text-emerald-400',
    bar: 'bg-emerald-600',
  },
  intermediate: {
    badge: 'bg-sky-700 text-white',
    text: 'text-sky-700 dark:text-sky-400',
    bar: 'bg-sky-600',
  },
  advanced: {
    badge: 'bg-violet-700 text-white',
    text: 'text-violet-700 dark:text-violet-400',
    bar: 'bg-violet-600',
  },
  senior: {
    badge: 'bg-amber-700 text-white',
    text: 'text-amber-800 dark:text-amber-400',
    bar: 'bg-amber-600',
  },
  sprint: {
    badge: 'bg-brand text-white',
    text: 'text-brand dark:text-[#ef8f4a]',
    bar: 'bg-brand',
  },
};
