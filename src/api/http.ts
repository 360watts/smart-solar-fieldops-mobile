import { Env } from '../config/env';
import type { AuthTokens } from '../auth/authStorage';
import { getStoredTokens, storeAuth, getStoredUser, clearStoredAuth } from '../auth/authStorage';

async function parseErrorResponse(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const body = JSON.parse(text);
    if (body?.error) return body.error;
    if (body?.detail) return typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
  } catch {
    // ignore
  }
  return text || `API request failed: ${response.status} ${response.statusText}`;
}

async function refreshToken(tokens: AuthTokens): Promise<AuthTokens | null> {
  try {
    const response = await fetch(`${Env.apiBaseUrl}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { access: string };
    const nextTokens: AuthTokens = { access: data.access, refresh: tokens.refresh };
    const user = await getStoredUser();
    if (user) await storeAuth(nextTokens, user);
    return nextTokens;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  { auth }: { auth?: 'required' | 'optional' | 'none' } = { auth: 'optional' }
): Promise<T> {
  const url = `${Env.apiBaseUrl}${endpoint}`;
  let tokens = await getStoredTokens();

  const mergeHeaders = (base: Record<string, string>, extra?: HeadersInit): Record<string, string> => {
    const out: Record<string, string> = { ...base };
    if (!extra) return out;
    if (Array.isArray(extra)) {
      for (const [k, v] of extra) out[k] = v;
      return out;
    }
    if (extra instanceof Headers) {
      extra.forEach((v: string, k: string) => {
        out[k] = v;
      });
      return out;
    }
    return { ...out, ...(extra as Record<string, string>) };
  };

  const attempt = async (t: AuthTokens | null): Promise<Response> => {
    const base: Record<string, string> = { 'Content-Type': 'application/json' };
    if (t?.access && auth !== 'none') base.Authorization = `Bearer ${t.access}`;
    const headers = mergeHeaders(base, options.headers);
    return fetch(url, { ...options, headers });
  };

  let response = await attempt(tokens);

  if (response.status === 401 && tokens?.refresh && auth !== 'none') {
    const refreshed = await refreshToken(tokens);
    if (refreshed) {
      tokens = refreshed;
      response = await attempt(tokens);
    }
  }

  if (response.status === 401 && auth === 'required') {
    await clearStoredAuth();
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const message = await parseErrorResponse(response);
    throw new Error(message);
  }

  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

