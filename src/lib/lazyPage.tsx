import { lazy, type ComponentType } from 'react';

export type LazyPage<P extends object> = ComponentType<P> & { preload: () => Promise<void> };

/**
 * React.lazy with a `preload()`. Once the code has loaded (by preload or a first visit) the
 * page renders straight away, without showing the loading skeleton again.
 */
export function lazyPage<P extends object = Record<string, never>>(
  load: () => Promise<{ default: ComponentType<P> }>,
): LazyPage<P> {
  let Loaded: ComponentType<P> | null = null;
  const remember = () =>
    load().then((module) => {
      Loaded = module.default;
      return module;
    });
  // LazyExoticComponent adds ref typing that generic props cannot satisfy; it renders the same.
  const Lazy = lazy(remember) as unknown as ComponentType<P>;
  function Page(props: P) {
    const Component = Loaded;
    return Component ? <Component {...props} /> : <Lazy {...props} />;
  }
  Page.preload = () => remember().then(() => undefined);
  return Page;
}
