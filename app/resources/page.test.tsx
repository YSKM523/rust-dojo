// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ResourcesPage from './page';

describe('ResourcesPage', () => {
  it('renders an empty Rust resource library shell', () => {
    render(<ResourcesPage />);

    expect(screen.getByText('FIELD LIBRARY')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rust 实战资料库' })).toBeInTheDocument();
    expect(screen.getByText('Entries').nextElementSibling).toHaveTextContent('0');
    expect(screen.getByRole('link', { name: '立即开练' })).toHaveAttribute(
      'href',
      '/exercise/m1-01',
    );
  });
});
