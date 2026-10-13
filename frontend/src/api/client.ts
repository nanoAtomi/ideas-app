/**
 * Error with the backend's message and HTTP status. `detail` keeps a structured detail
 * (e.g. {"code": "access_change", ...}) for callers that react to specific cases.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail: unknown = null,
  ) {
    super(message);
  }
}

/**
 * JSON API call. Same-origin cookies carry the gateway session; X-Requested-With is
 * the backend's CSRF check for mutations.
 */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(path, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    headers: {
      'X-Requested-With': 'ideas',
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message = typeof detail === 'string' ? detail : detail?.code ?? `Error ${response.status}`;
    throw new ApiError(message, response.status, detail ?? null);
  }
  return data as T;
}
