import { env } from './env';

interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export const apiRequest = async <T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> => {
  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', 'Bearer ' + options.token);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const json = (await response.json()) as T | ApiErrorPayload;
  if (!response.ok) {
    const payload = json as ApiErrorPayload;
    throw new Error(payload.error?.message ?? 'Request failed');
  }

  return json as T;
};
