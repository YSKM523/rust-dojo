// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExercisePage from './page';

vi.mock('@/content/exercises', () => ({
  getExerciseById: () => ({
    id: 'm1-01',
    moduleId: 'm1',
    title: 'Hello, Rust',
    difficulty: 1,
    prompt: '写出第一个 Rust 程序。',
    starterCode: 'fn main() {}',
    solutionCode: 'fn main() { println!("Hello, Rust!"); }',
    judgeMode: 'stdout',
    expectedStdout: 'Hello, Rust!',
  }),
  exerciseNav: () => undefined,
}));

vi.mock('@/components/Playground', () => ({
  Playground: ({ exercise }: { exercise: { id: string } }) => (
    <div data-testid="playground">playground:{exercise.id}</div>
  ),
}));

vi.mock('@/components/ExerciseNavBar', () => ({
  ExerciseNavBar: () => <nav>exercise nav</nav>,
}));

describe('ExercisePage', () => {
  it('renders a minimal Rust workbench shell', async () => {
    const ui = await ExercisePage({ params: Promise.resolve({ id: 'm1-01' }) });
    render(ui);

    expect(screen.getByText('RUST WORKBENCH')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByTestId('playground')).toHaveTextContent('m1-01');
  });
});
