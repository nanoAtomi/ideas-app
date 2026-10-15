/**
 * Platform-wide preferences - language and appearance - shared by the portal and every
 * app through cookies on the parent domain (*.nicasso.de): pick dark mode in one app
 * and the portal and all other apps follow. Copy into an app's `src/` (blueprint).
 *
 * Cookies, not localStorage: storage is per origin (ideas.nicasso.de ≠ portal.nicasso.de).
 */
/** "system" = nothing picked yet: the device decides. */
export type Theme = 'system' | 'light' | 'dark';

/** Each language in its own words - that's how people find theirs in a list. */
export const LANGUAGE_NAMES = { de: 'Deutsch', en: 'English' } as const;

export const LANG_COOKIE = 'nicasso-lang';
const THEME_COOKIE = 'nicasso-theme';
const YEAR = 60 * 60 * 24 * 365;

/** ".nicasso.de" for app.nicasso.de; none on localhost (cookies then stay per host). */
export function cookieDomain(): string | undefined {
  const host = window.location.hostname;
  if (host === 'localhost' || host.endsWith('.localhost') || /^[\d.]+$/.test(host)) return undefined;
  const parts = host.split('.');
  return parts.length > 2 ? `.${parts.slice(-2).join('.')}` : `.${host}`;
}

export function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function writeCookie(name: string, value: string | null): void {
  const domain = cookieDomain();
  const parts = [`${name}=${encodeURIComponent(value ?? '')}`, 'Path=/', 'SameSite=Lax', `Max-Age=${value === null ? 0 : YEAR}`];
  if (domain) parts.push(`Domain=${domain}`);
  if (window.location.protocol === 'https:') parts.push('Secure');
  document.cookie = parts.join('; ');
}

export function readTheme(): Theme {
  const value = readCookie(THEME_COOKIE);
  return value === 'light' || value === 'dark' ? value : 'system';
}

const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');

/** Sets class "dark" on <html> (Tailwind: `@custom-variant dark (&:where(.dark, .dark *))`). */
export function applyTheme(theme: Theme = readTheme()): void {
  const dark = theme === 'dark' || (theme === 'system' && !!media()?.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  writeCookie(THEME_COOKIE, theme === 'system' ? null : theme);
  applyTheme(theme);
}

/** What is shown right now. */
export function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

/** The one appearance button: flips what is shown and keeps it from then on. */
export function toggleTheme(): Theme {
  const next = isDark() ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/** Call once at start (main.tsx), before rendering: applies the theme and follows the device in "system". */
export function initTheme(): void {
  applyTheme();
  media()?.addEventListener?.('change', () => applyTheme());
}
