// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from './page';

describe('Home', () => {
  it('renders the landing narrative: hero, stats, JD facts, route and method', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { level: 1, name: 'Rust 道场' })).toBeInTheDocument();
    expect(
      screen.getByText('从 0 到生产级后端，按 2026 真实招聘需求设计。'),
    ).toBeInTheDocument();
    expect(screen.getByText('Rust Playground')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '为什么是 Rust' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '八个模块' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '学习方式' })).toBeInTheDocument();
  });

  it('points both hero CTAs at the route map and the job resources', () => {
    render(<Home />);

    expect(screen.getByRole('link', { name: /开始学习/ })).toHaveAttribute('href', '/learn');
    expect(screen.getByRole('link', { name: /求职地图/ })).toHaveAttribute('href', '/resources');
  });

  it('lists all eight modules in order', () => {
    render(<Home />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(8);
    expect(items[0]).toHaveTextContent('01');
    expect(items[0]).toHaveTextContent('起步与所有权');
    expect(items[7]).toHaveTextContent('08');
    expect(items[7]).toHaveTextContent('生产化与求职');
  });
});
