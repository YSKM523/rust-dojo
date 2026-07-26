// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RunOutput } from './RunOutput';

describe('RunOutput', () => {
  it('shows standard output and highlights compiler error lines', () => {
    render(
      <RunOutput
        running={false}
        result={{
          verdict: { passed: false, reason: '编译或运行失败' },
          stdout: 'program output\n',
          stderr: 'warning: unused variable\nerror[E0382]: borrow of moved value',
        }}
      />,
    );

    expect(screen.getByRole('region', { name: '标准输出' })).toHaveTextContent('program output');
    const compiler = screen.getByRole('region', { name: '编译器信息' });
    expect(within(compiler).getByText(/error\[E0382\]/)).toHaveClass('text-bad');
    expect(within(compiler).getByText(/warning: unused/)).not.toHaveClass('text-bad');
  });

  it('renders a responsive expected/actual diff with the first differing line highlighted', () => {
    render(
      <RunOutput
        running={false}
        result={{
          verdict: { passed: false, reason: '输出不符：第 2 行开始与期望不同' },
          expectedStdout: 'alpha\nbeta\nthird',
          stdout: 'alpha\nwrong\nthird',
        }}
      />,
    );

    const expected = screen.getByRole('region', { name: '期望输出' });
    const actual = screen.getByRole('region', { name: '实际输出' });
    expect(within(expected).getByText('beta')).toHaveAttribute('data-highlighted', 'true');
    expect(within(actual).getByText('wrong')).toHaveAttribute('data-highlighted', 'true');
    expect(within(actual).getByText('third')).not.toHaveAttribute('data-highlighted', 'true');
  });

  it('does not render empty output panels before the first run', () => {
    const { container } = render(<RunOutput running={false} result={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
