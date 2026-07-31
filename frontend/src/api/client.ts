import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiError } from '../types';

// Default to a relative `/api` path so the frontend talks to whatever origin
// it was served from (works behind any reverse proxy, any host port, http or https).
// In dev with `docker-compose.dev.yml`, the frontend container sets
//   VITE_API_BASE=http://localhost:3001
// so the request goes cross-origin to the backend container.
// In the unified production image the SPA + API share the same Express process,
// so the default relative path is exactly what we want.
const BASE_URL =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

export class ApiClientError extends Error {
  status: number;
  code: string;
  payload?: unknown;

  constructor(status: number, code: string, message: string, payload?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

function extractErrorPayload(error: AxiosError): {
  status: number;
  api: ApiError | null;
  raw: unknown;
} {
  const status = error.response?.status ?? 0;
  const raw = error.response?.data;
  let api: ApiError | null = null;
  if (raw && typeof raw === 'object' && 'error' in raw) {
    const errField = (raw as { error: unknown }).error;
    if (errField && typeof errField === 'object') {
      api = errField as ApiError;
    }
  }
  return { status, api, raw };
}

client.interceptors.response.use(
  (resp) => resp,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const { status, api, raw } = extractErrorPayload(error);
      const code = api?.code ?? error.code ?? 'NETWORK_ERROR';
      const message =
        api?.message ??
        (status === 0
          ? '无法连接到后端服务,请检查网络或后端进程'
          : `请求失败 (HTTP ${status})`);
      return Promise.reject(new ApiClientError(status, code, message, raw));
    }
    return Promise.reject(
      new ApiClientError(0, 'UNKNOWN_ERROR', (error as Error)?.message ?? '未知错误'),
    );
  },
);

export { BASE_URL };
