// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from './page';

describe('Home', () => {
  it('renders a high-impact product showcase with resource entry points', () => {
    render(<Home />);

    expect(screen.getByText('SYSTEM / 01')).toBeInTheDocument();
    expect(screen.getByText('SIGNALS / 02')).toBeInTheDocument();
    expect(screen.getByText('IDENTITY / 03')).toBeInTheDocument();
    expect(screen.getByText('ACTIONS / 04')).toBeInTheDocument();
    expect(screen.getByText('LIVE RUST TRAINING SYSTEM')).toBeInTheDocument();
    expect(screen.getByText('Rust Playground')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rust 道场' })).toBeInTheDocument();
    expect(screen.getByText('CODE STAGE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '资料库精选' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '训练路径' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '从问题到 Rust' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /进入资料库/ })[0]).toHaveAttribute(
      'href',
      '/resources',
    );
  });
});
