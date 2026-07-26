// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Topbar } from './Topbar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/resources',
}));

vi.mock('@/lib/auth/useSession', () => ({
  useSession: () => ({ user: null, loading: false }),
}));

describe('Topbar', () => {
  it('renders resources navigation and marks it active', () => {
    render(<Topbar />);

    const link = screen.getByRole('link', { name: '资料库' });
    expect(link).toHaveAttribute('href', '/resources');
    expect(link).toHaveClass('font-semibold');
  });

  it('renders compact product navigation', () => {
    render(<Topbar />);

    expect(screen.getByRole('link', { name: 'Rust 道场' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '学习路线图' })).toHaveAttribute('href', '/learn');
    expect(screen.getByRole('link', { name: '资料库' })).toHaveAttribute('href', '/resources');
    expect(screen.getByRole('link', { name: '我的足迹' })).toHaveAttribute('href', '/me');
  });
});
