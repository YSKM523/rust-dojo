// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LearnPage from './page';

describe('LearnPage', () => {
  it('renders the empty training route shell', () => {
    render(<LearnPage />);

    expect(screen.getByText('TRAINING ROUTE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '训练路径' })).toBeInTheDocument();
    expect(
      screen.getAllByRole('link').some((link) => link.getAttribute('href')?.startsWith('/learn/m')),
    ).toBe(false);
  });
});
