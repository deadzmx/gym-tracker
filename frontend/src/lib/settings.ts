// localStorage-backed user settings. Used to persist LLM provider + API key
// in the browser, so the user doesn't have to re-enter on every visit.
// API key is sensitive — we never log it or send to the backend for storage.

import type { AppSettings, LlmProvider } from '../types';

const STORAGE_KEY = 'gym-tracker.settings.v1';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { llm: null };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    if (parsed.llm && typeof parsed.llm.api_key === 'string' && typeof parsed.llm.provider === 'string') {
      return { llm: { provider: parsed.llm.provider as LlmProvider, api_key: parsed.llm.api_key } };
    }
    return { llm: null };
  } catch {
    return { llm: null };
  }
}

export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to save settings to localStorage:', err);
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return key.slice(0, 4) + '••••' + key.slice(-4);
}
