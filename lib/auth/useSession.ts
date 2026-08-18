export interface SessionUser {
  email: string;
}

export async function fetchSession(fetcher: typeof fetch = fetch): Promise<SessionUser | null> {
  try {
    const response = await fetcher('/api/auth/me');
    const data = (await response.json()) as { user?: SessionUser | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}
