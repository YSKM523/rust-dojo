import { describe, expect, it } from 'vitest';
import { normalizeStdout } from './normalize';

describe('normalizeStdout', () => {
  it('removes trailing spaces and tabs from every line', () => {
    expect(normalizeStdout('alpha  \nbeta\t \ngamma')).toBe('alpha\nbeta\ngamma');
  });

  it('drops trailing empty lines without dropping interior empty lines', () => {
    expect(normalizeStdout('alpha\n\nbeta\n\n  \n')).toBe('alpha\n\nbeta');
  });

  it('normalizes CRLF line endings', () => {
    expect(normalizeStdout('alpha\r\nbeta\r\n')).toBe('alpha\nbeta');
  });

  it('normalizes whitespace-only output to an empty string', () => {
    expect(normalizeStdout(' \t\n\n')).toBe('');
  });
});
