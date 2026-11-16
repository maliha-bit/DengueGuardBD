import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import { setMockDelay } from '@/api/mock/handlers';
import i18n from '@/lib/i18n';

// jsdom has no ResizeObserver (used by Recharts' ResponsiveContainer).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

beforeAll(() => {
  setMockDelay(0);
});

beforeEach(async () => {
  window.history.replaceState(null, '', '/');
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
});
