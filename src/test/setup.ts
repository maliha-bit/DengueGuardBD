import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import { resetMockState, setMockDelay } from '@/api/mock/handlers';
import i18n from '@/lib/i18n';
import { installMatchMedia, setDesktop } from './media';

// jsdom has no ResizeObserver (used by Recharts' ResponsiveContainer).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
// Newer Node versions expose their own `localStorage` global, which shadows jsdom's and does
// nothing without --localstorage-file. Use a simple in-memory Storage instead.
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
}
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: new MemoryStorage(),
});
// Async queries wait up to 5s so parallel test files under load do not flake.
configure({ asyncUtilTimeout: 5000 });
installMatchMedia();
// jsdom does not implement scrolling.
window.scrollTo = () => {};

beforeAll(() => {
  setMockDelay(0);
});

beforeEach(async () => {
  window.history.replaceState(null, '', '/');
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
  setDesktop(false);
  resetMockState();
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
});
