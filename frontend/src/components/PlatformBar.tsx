import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AccountMenu, type PlatformUser } from './AccountMenu';

export { initials, menuIconClass, menuItemClass, type PlatformUser } from './AccountMenu';

/*
 * Shell "top bar" (blueprint template - copy into `src/components/` with
 * AccountMenu.tsx; the other shell is PlatformSidebar). Apps may restyle it later:
 *
 *   [‹ PORTAL] │ 💡 App name   <nav links>                         (AB)
 *
 * Left: back to the portal in the platform's wordmark style. Right: the account menu
 * (the portal's profile panel). Phones use the app's bottom nav for its views.
 *
 * Texts (de/en): platform.portal, platform.portalTitle + AccountMenu's.
 */

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
  /** App-specific entries at the top of the account menu (e.g. an admin view on phones). */
  menuItems?: ReactNode;
}

export function PlatformBar({ appName, appIcon, user, nav, navLabel, actions, menuItems }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-md dark:border-white/10 dark:bg-[#15161b]/85">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        {user.portalUrl && (
          <>
            <PortalChip url={user.portalUrl} />
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
          <AccountMenu user={user} items={menuItems} />
        </div>
      </div>
    </header>
  );
}

/** "‹ PORTAL" - the way back, in the wordmark style. */
export function PortalChip({ url }: { url: string }) {
  const { t } = useTranslation();
  return (
    <a
      href={url}
      title={t('platform.portalTitle')}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-[11px] font-bold tracking-[0.3em] text-slate-700 uppercase transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
    >
      <span aria-hidden className="text-sm tracking-normal">‹</span>
      {t('platform.portal')}
    </a>
  );
}
