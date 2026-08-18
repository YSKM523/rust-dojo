import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const raw = hex.replace('#', '');
  const rgb = [0, 2, 4].map((start) => parseInt(raw.slice(start, start + 2), 16));
  const [r, g, b] = rgb.map(channelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

function themeBlock(css: string, theme: 'light' | 'dark'): string {
  const match = css.match(new RegExp(`^\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  if (!match) throw new Error(`theme block ${theme} not found`);
  return match[1];
}

function token(block: string, name: string): string {
  const match = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`));
  if (!match) throw new Error(`token --${name} not found`);
  return match[1];
}

const css = readFileSync(join(process.cwd(), 'islands/site.css'), 'utf8');
const light = themeBlock(css, 'light');
const dark = themeBlock(css, 'dark');

describe('theme contrast', () => {
  it('light theme is genuinely light, dark theme genuinely dark', () => {
    expect(luminance(token(light, 'bg'))).toBeGreaterThan(0.7);
    expect(luminance(token(dark, 'bg'))).toBeLessThan(0.08);
  });

  it.each([
    ['light', light],
    ['dark', dark],
  ])('%s: body text tokens meet AA on their surfaces', (_name, block) => {
    for (const surface of ['bg', 'bg2', 'bg3', 'panel', 'panel2']) {
      expect(
        contrastRatio(token(block, 'fg'), token(block, surface)),
        `fg on ${surface}`,
      ).toBeGreaterThanOrEqual(7);
      expect(
        contrastRatio(token(block, 'fg2'), token(block, surface)),
        `fg2 on ${surface}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([
    ['light', light],
    ['dark', dark],
  ])('%s: brand blocks keep AA with white text', (_name, block) => {
    for (const name of ['brand', 'brand-hover']) {
      expect(contrastRatio('#ffffff', token(block, name)), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('accent block colors used in stats band keep AA with white text', () => {
    // Tailwind v4 stock values: sky-700 / emerald-700 / violet-700
    for (const hex of ['#0369a1', '#047857', '#6d28d9']) {
      expect(contrastRatio('#ffffff', hex), hex).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([
    ['light', light],
    ['dark', dark],
  ])('%s: link and status colors readable on bg', (_name, block) => {
    for (const name of ['link', 'ok', 'bad']) {
      expect(
        contrastRatio(token(block, name), token(block, 'bg')),
        name,
      ).toBeGreaterThanOrEqual(3.4);
    }
  });
});
