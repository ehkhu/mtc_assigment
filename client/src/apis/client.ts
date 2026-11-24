const TOKEN_KEY = "clinic_token";

/** Thrown for any non-2xx API response. `status` lets the UI tell 403 from 404. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function authToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Fetch wrapper. Paths are API paths such as `/patients`.
 * In development Vite proxies `/api` to the Express server.
 */
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authToken();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const base = import.meta.env.VITE_API_URL ?? "/api";
  const response = await fetch(`${base}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, body?.error ?? "Request failed");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
