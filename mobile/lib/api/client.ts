/**
 * VOiD — API Client
 *
 * Central HTTP client for all backend communication.
 * Reads the API_URL from the .env file.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  token?: string;
}

/**
 * Make an authenticated request to the VOiD backend.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (fetchError) {
    throw new Error(
      `Network error: Cannot reach ${API_URL}. Is the backend running and ngrok URL correct?`
    );
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || JSON.stringify(errorBody);
    } catch {
      try {
        detail = await response.text();
      } catch {
        // keep the status code
      }
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}
