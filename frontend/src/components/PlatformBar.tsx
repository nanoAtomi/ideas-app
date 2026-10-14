import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { readTheme, setTheme, type Theme } from '../prefs';

/*
 * The platform bar every app starts from (blueprint template - copy into
 * `src/components/` and adapt freely; apps may look different over time):
 *
 *   [‹ PORTAL] │ 💡 App name   <nav links>                         (AB)▾
 *
 * Left: back to the portal in the platform's wordmark style. Right: the user's avatar
 * opens a menu with name, e-mail, language, appearance, profile, feedback, sign-out.
 * Language and appearance are platform-wide (prefs.ts cookies).
 *
 * Needs these texts (de/en): platform.portal, platform.portalTitle, platform.menu,
 * platform.language, platform.theme, platform.themeSystem/Light/Dark,
 * platform.profile, platform.feedback, platform.signOut.
 */

export interface PlatformUser {
  name: string;
  email: string | null;
  /** Set behind the gateway; null standalone. */
  portalUrl: string | null;
  logoutUrl: string | null;
  feedbackUrl: string | null;
}

const LANGUAGES = ['de', 'en'] as const;
const THEMES: { value: Theme; icon: string; label: string }[] = [
  { value: 'system', icon: '🖥️', label: 'platform.themeSystem' },
  { value: 'light', icon: '☀️', label: 'platform.themeLight' },
  { value: 'dark', icon: '🌙', label: 'platform.themeDark' },
];

/** Class for app entries passed as `menuItems`, so they match the built-in ones. */
export const menuItemClass = 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-slate-100 dark:hover:bg-white/10';

export function initials(name: string): string {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

interface Props {
  appName: string;
  /** An emoji, or a small element (e.g. the app's gradient tile). */
  appIcon: ReactNode;
  user: PlatformUser;
  /** The app's views (desktop; phones use a bottom nav). */
  nav?: ReactNode;
  navLabel?: string;
  /** Desktop-only extras next to the avatar, e.g. the app's main call to action. */
  actions?: ReactNode;
  /** App-specific entries at the top of the avatar menu (e.g. an admin view on phones). */
  menuItems?: ReactNode;
}

export function PlatformBar({ appName, appIcon, user, nav, navLabel, actions, menuItems }: Props) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-md dark:border-white/10 dark:bg-[#15161b]/85">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        {user.portalUrl && (
          <>
            <a
              href={user.portalUrl}
              title={t('platform.portalTitle')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-[11px] font-bold tracking-[0.3em] text-slate-700 uppercase transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            >
              <span aria-hidden className="text-sm tracking-normal">‹</span>
              {t('platform.portal')}
            </a>
            <span aria-hidden className="h-6 w-px bg-slate-200 dark:bg-white/10" />
          </>
        )}
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="text-xl leading-none">{appIcon}</span>
          <span className="truncate text-base font-bold tracking-tight">{appName}</span>
        </span>
        {nav && <nav aria-label={navLabel ?? appName} className="ml-4 hidden items-center gap-1 sm:flex">{nav}</nav>}
        <div className="ml-auto flex items-center gap-3">
          {actions && <div className="hidden items-center gap-3 sm:flex">{actions}</div>}
          <UserMenu user={user} items={menuItems} />
        </div>
      </div>
    </header>
  );
}

function UserMenu({ user, items }: { user: PlatformUser; items?: ReactNode }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const segment = (active: boolean) =>
    `flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${active ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white' : 'text-slate-500'}`;
  const item = menuItemClass;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('platform.menu')}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid size-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white ring-offset-2 hover:ring-2 hover:ring-slate-300 dark:bg-white dark:text-slate-900 dark:ring-offset-[#15161b]"
      >
        {initials(user.name)}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#1a1b20]">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">{initials(user.name)}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{user.name}</span>
              {user.email && <span className="block truncate text-xs text-slate-500">{user.email}</span>}
            </span>
          </div>
          <div className="space-y-2 border-y border-slate-100 px-3 py-3 dark:border-white/10">
            <p className="text-xs font-semibold text-slate-500">{t('platform.language')}</p>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.06]">
              {LANGUAGES.map((language) => (
                <button key={language} type="button" aria-pressed={i18n.resolvedLanguage === language} onClick={() => void i18n.changeLanguage(language)} className={segment(i18n.resolvedLanguage === language)}>
                  {language.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="pt-1 text-xs font-semibold text-slate-500">{t('platform.theme')}</p>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.06]">
              {THEMES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={theme === option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setThemeState(option.value);
                  }}
                  className={segment(theme === option.value)}
                >
                  <span aria-hidden>{option.icon}</span> {t(option.label)}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-1" onClick={(event) => (event.target as Element).closest('a') && setOpen(false)}>
            {items}
            {user.portalUrl && (
              <a href={`${user.portalUrl}/profile`} className={item}>
                👤 {t('platform.profile')}
              </a>
            )}
            {user.feedbackUrl && (
              <a href={user.feedbackUrl} className={item}>
                💬 {t('platform.feedback')}
              </a>
            )}
            {user.logoutUrl && (
              <a href={user.logoutUrl} className={`${item} text-red-700 dark:text-red-400`}>
                ↩ {t('platform.signOut')}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
