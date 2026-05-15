const TOKEN_KEY = 'flyer_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message ?? `Request failed: ${res.status}`;
    if (res.status === 401 && opts.auth) clearToken();
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}
