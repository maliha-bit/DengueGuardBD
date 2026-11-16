/** jsdom has no matchMedia. Tests default to a phone; call setDesktop(true) for the desktop layout. */
let desktop = false;

export function setDesktop(value: boolean) {
  desktop = value;
}

export function installMatchMedia() {
  window.matchMedia = (query: string) =>
    ({
      matches: desktop && query.includes('min-width'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
