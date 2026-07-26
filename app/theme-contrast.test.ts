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

describe('theme contrast', () => {
  it('uses a dark default page background', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    const lightTheme = css.match(/\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/)?.[1];
    const bg = lightTheme?.match(/--bg:\s*(#[0-9a-fA-F]{6});/)?.[1];

    expect(bg).toBeDefined();
    expect(luminance(bg!), bg).toBeLessThan(0.08);
  });

  it('brand buttons have AA contrast with white text', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    const brandColors = [...css.matchAll(/--brand(?:-hover)?:\s*(#[0-9a-fA-F]{6});/g)].map(
      (match) => match[1],
    );

    expect(brandColors.length).toBeGreaterThanOrEqual(2);
    for (const color of brandColors) {
      expect(contrastRatio('#ffffff', color), color).toBeGreaterThanOrEqual(4.5);
    }
  });
});
