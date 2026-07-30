import { vi } from 'vitest';

export function mockAxiosError(status: number, code: string, message: string) {
  const err = new Error('Request failed') as Error & {
    isAxiosError: boolean;
    response: { status: number; data: { error: { code: string; message: string } } };
  };
  err.isAxiosError = true;
  err.response = {
    status,
    data: { error: { code, message } },
  };
  return err;
}

export const mockedAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};
