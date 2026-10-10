import { colorScheme, ColorScheme } from './colors';

/**
 * A module's styles, made once per colour scheme instead of once at load:
 * `StyleSheet.create` copies the colours it's given, so a sheet made in light
 * mode would stay light. Wrap it — `themedStyles(() => StyleSheet.create({...}))`
 * — and `styles.x` returns the current scheme's style, made the first time
 * it's needed.
 */
export function themedStyles<T extends object>(make: () => T): T {
  const made: Partial<Record<ColorScheme, T>> = {};
  return new Proxy({} as T, {
    get(_target, key) {
      const scheme = colorScheme();
      const sheet = (made[scheme] ??= make());
      return sheet[key as keyof T];
    },
  });
}
