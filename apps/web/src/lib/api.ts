const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {'Content-Type': 'application/json', ...options.headers},
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as {message?: string | string[]} | null;
    const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
    throw new ApiError(message ?? 'Something went wrong', response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
