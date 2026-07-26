// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LoginPage from './page';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('shows a Chinese inline error for empty email without calling the API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }));

    expect(screen.getByRole('alert')).toHaveTextContent('请填写邮箱');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
