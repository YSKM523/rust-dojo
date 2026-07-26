// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '@/lib/rust/types';
import { judgeExercise } from '@/lib/rust/judge';
import { markCompleted } from '@/lib/progress/store';
import { Playground } from './Playground';

vi.mock('@/lib/rust/judge', () => ({ judgeExercise: vi.fn() }));
vi.mock('@/lib/progress/store', () => ({ markCompleted: vi.fn() }));
vi.mock('./CodeEditor', () => ({
  CodeEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="Rust 代码编辑器"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));
vi.mock('./AiCopilot', () => ({
  AiCopilot: () => <div data-testid="ai-copilot">AI</div>,
}));

const ex: Exercise = {
  id: 'm1-01',
  moduleId: 'm1',
  title: 'Hello, Rust',
  difficulty: 1,
  prompt: '打印一句问候。',
  starterCode: 'fn main() {}',
  solutionCode: 'fn main() { println!("hello"); }',
  judgeMode: 'stdout',
  expectedStdout: 'hello',
  hints: ['先找到 main 函数', '使用 println! 宏'],
};

beforeEach(() => {
  vi.mocked(judgeExercise).mockReset();
  vi.mocked(markCompleted).mockReset();
});

describe('Playground', () => {
  it('runs the current code, shows a passing verdict, and records completion', async () => {
    vi.mocked(judgeExercise).mockResolvedValue({
      verdict: { passed: true },
      stdout: 'hello\n',
    });
    render(<Playground exercise={ex} />);

    const editor = screen.getByLabelText('Rust 代码编辑器');
    expect(editor).toHaveValue(ex.starterCode);
    fireEvent.change(editor, {
      target: { value: 'fn main() { println!("hello"); }' },
    });
    fireEvent.click(screen.getByRole('button', { name: '运行' }));

    expect(
      screen.getByRole('button', { name: '正在编译运行（Rust Playground）…' }),
    ).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('通过'));
    expect(judgeExercise).toHaveBeenCalledWith(
      ex,
      'fn main() { println!("hello"); }',
    );
    expect(markCompleted).toHaveBeenCalledWith('m1-01');
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('resets the editor and exposes exercise hints', () => {
    render(<Playground exercise={ex} />);
    const editor = screen.getByLabelText('Rust 代码编辑器');
    fireEvent.change(editor, { target: { value: 'changed' } });

    fireEvent.click(screen.getByRole('button', { name: '重置' }));

    expect(editor).toHaveValue(ex.starterCode);
    expect(screen.getByText('提示')).toBeInTheDocument();
    expect(screen.getByText('先找到 main 函数')).toBeInTheDocument();
    expect(screen.getByText('使用 println! 宏')).toBeInTheDocument();
  });

  it('shows a friendly run error without recording completion', async () => {
    vi.mocked(judgeExercise).mockRejectedValue(new Error('Playground 暂时不可用'));
    render(<Playground exercise={ex} />);

    fireEvent.click(screen.getByRole('button', { name: '运行' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Playground 暂时不可用'),
    );
    expect(markCompleted).not.toHaveBeenCalled();
  });
});
