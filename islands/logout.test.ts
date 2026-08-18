// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountLogout, performLogout } from './logout';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('logout island', () => {
  it('posts logout before navigating home', async () => {
    const request = vi.fn().mockResolvedValue(new Response('{}'));
    const navigate = vi.fn();

    await performLogout(request, navigate);

    expect(request).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('still navigates home when the logout request fails', async () => {
    const request = vi.fn().mockRejectedValue(new Error('offline'));
    const navigate = vi.fn();

    await performLogout(request, navigate);

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('mounts each logout button only once', async () => {
    document.body.innerHTML = '<button data-island="logout">退出</button>';
    const request = vi.fn().mockResolvedValue(new Response('{}'));
    const navigate = vi.fn();

    mountLogout(document, request, navigate);
    mountLogout(document, request, navigate);
    fireEvent.click(document.querySelector('button')!);
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));

    expect(request).toHaveBeenCalledTimes(1);
  });
});
