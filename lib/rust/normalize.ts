export function normalizeStdout(stdout: string): string {
  const lines = stdout
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''));

  while (lines.at(-1) === '') lines.pop();
  return lines.join('\n');
}
