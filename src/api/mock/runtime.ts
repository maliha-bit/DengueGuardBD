/**
 * Shared mock-API runtime: simulated network delay and the `?mock=` dev scenarios.
 * `?mock=empty` / `?mock=error` show empty / error states, `?mock=stale` makes the forecast
 * two days old, `?mock=race` makes the next booking find its slot just filled.
 */
let delayMs = 400;

/** Tests set this to 0. */
export function setMockDelay(ms: number) {
  delayMs = ms;
}

export const getMockDelay = () => delayMs;

export type Scenario = 'normal' | 'empty' | 'error' | 'stale' | 'race';
const SCENARIOS: Scenario[] = ['empty', 'error', 'stale', 'race'];

export function scenario(): Scenario {
  if (typeof window === 'undefined') return 'normal';
  const value = new URLSearchParams(window.location.search).get('mock') as Scenario | null;
  return value && SCENARIOS.includes(value) ? value : 'normal';
}

export class MockApiError extends Error {}

export async function respond<T>(build: () => T, empty: T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  const mode = scenario();
  if (mode === 'error') throw new MockApiError('Simulated network error');
  if (mode === 'empty') return empty;
  return build();
}

/** Writes ignore the "empty" scenario (they act on the real in-memory store). */
export async function mutate<T>(run: () => T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (scenario() === 'error') throw new MockApiError('Simulated network error');
  return run();
}
