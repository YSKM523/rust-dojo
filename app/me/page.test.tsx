// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const clearProgressMock = vi.fn();

vi.mock('@/lib/progress/useProgress', () => ({
  useCompletedIds: () => ['m1-01'],
}));

vi.mock('@/lib/auth/useSession', () => ({
  useSession: () => ({ user: null, loading: false }),
}));

vi.mock('@/lib/progress/store', () => ({
  clearProgress: () => clearProgressMock(),
}));

import MePage from './page';

beforeEach(() => {
  clearProgressMock.mockReset();
});

describe('MePage', () => {
  it('requires an inline confirmation before clearing progress', () => {
    render(<MePage />);

    fireEvent.click(screen.getByRole('button', { name: '清空进度' }));

    expect(clearProgressMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '确认清空' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '确认清空' }));

    expect(clearProgressMock).toHaveBeenCalledTimes(1);
  });
});
