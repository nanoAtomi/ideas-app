import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { isDark, LANGUAGE_NAMES, toggleTheme } from '../prefs';

/*
 * The platform bar every app starts from (blueprint template - copy into
 * `src/components/` and adapt freely; apps may look different over time):
 *
 *   [‹ PORTAL] │ 💡 App name   <nav links>                         (AB)
 *
 * Left: back to the portal in the platform's wordmark style. Right: the user's avatar
 * opens the same panel as the portal's - name, e-mail, language (native select: the
 * iPhone shows its wheel) and one light/dark button, profile, feedback, sign-out. A
 * popover on wide screens, a swipeable bottom sheet on phones. Language and appearance
 * are platform-wide (prefs.ts cookies).
 *
 * Needs these texts (de/en): platform.portal, platform.portalTitle, platform.menu,
 * platform.language, platform.toDark, platform.toLight, platform.close,
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

const isPhone = () => !window.matchMedia?.('(min-width: 640px)').matches;

function UserMenu({ user, items }: { user: PlatformUser; items?: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<'popover' | 'sheet' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open !== 'popover') return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('platform.menu')}
        aria-expanded={open !== null}
        onClick={() => setOpen(open ? null : isPhone() ? 'sheet' : 'popover')}
        className="grid size-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white ring-offset-2 hover:ring-2 hover:ring-slate-300 dark:bg-white dark:text-slate-900 dark:ring-offset-[#15161b]"
      >
        {initials(user.name)}
      </button>
      {open === 'popover' && (
        <div className="absolute top-12 right-0 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#1a1b20]">
          <MenuPanel user={user} items={items} onDone={() => setOpen(null)} />
        </div>
      )}
      {open === 'sheet' && (
        <BottomSheet label={t('platform.menu')} onClosed={() => setOpen(null)}>
          {(close) => (
            <>
              <MenuPanel user={user} items={items} onDone={close} />
              <button type="button" onClick={close} className="mt-3 mb-4 min-h-11 w-full rounded-xl bg-slate-100 text-sm font-semibold dark:bg-white/10">
                {t('platform.close')}
              </button>
            </>
          )}
        </BottomSheet>
      )}
    </div>
  );
}

/** The portal's profile panel: who, language + appearance, the app's items, profile, feedback, sign-out. */
function MenuPanel({ user, items, onDone }: { user: PlatformUser; items?: ReactNode; onDone: () => void }) {
  const { t } = useTranslation();
  const item = menuItemClass;
  return (
    <>
      <div className="flex items-center gap-3 px-1">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">{initials(user.name)}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{user.name}</span>
          {user.email && <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</span>}
        </span>
      </div>
      <div className="mt-5">
        <PrefsRow />
      </div>
      <div className="mt-4 space-y-0.5 border-t border-slate-100 pt-3 dark:border-white/10" onClick={(event) => (event.target as Element).closest('a') && onDone()}>
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
    </>
  );
}

/**
 * Language as a native select (more languages are just more options) and one button
 * that flips light/dark - until it is pressed, the device decides.
 */
function PrefsRow() {
  const { t, i18n } = useTranslation();
  const [dark, setDark] = useState(isDark);
  const current = (i18n.resolvedLanguage ?? 'de') as keyof typeof LANGUAGE_NAMES;
  const label = t(dark ? 'platform.toLight' : 'platform.toDark');
  return (
    <div className="flex gap-2">
      <label className="relative flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-slate-100 px-3 text-sm font-medium focus-within:ring-2 focus-within:ring-slate-400/50 dark:bg-white/[0.06]">
        <span aria-hidden>🌐</span>
        <span className="flex-1 truncate">{LANGUAGE_NAMES[current] ?? current}</span>
        <span aria-hidden className="text-slate-400">▾</span>
        <select
          aria-label={t('platform.language')}
          value={current}
          onChange={(event) => void i18n.changeLanguage(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
        >
          {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setDark(toggleTheme() === 'dark')}
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg transition-colors hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10"
      >
        <span aria-hidden>{dark ? '🌙' : '☀️'}</span>
      </button>
    </div>
  );
}

/** A pull longer than this, or a quick flick, closes the sheet. */
const CLOSE_PX = 120;
const FLICK_PX_PER_MS = 0.5;
const ANIMATION_MS = 250;

/**
 * iOS-style bottom sheet (same behaviour as the portal's): locks the page behind it,
 * follows the finger when pulled down (anywhere while scrolled to the top), closes on
 * a long pull or a flick and springs back otherwise; tap outside or Escape closes too.
 */
function BottomSheet({ label, onClosed, children }: { label: string; onClosed: () => void; children: (close: () => void) => ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(() => window.innerHeight);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ startY: null as number | null, lastY: 0, lastTime: 0, speed: 0, closing: false });

  const close = () => {
    if (drag.current.closing) return;
    drag.current.closing = true;
    setDragging(false);
    setOffset(panel.current?.offsetHeight || window.innerHeight);
    window.setTimeout(onClosed, ANIMATION_MS);
  };

  useEffect(() => {
    const restore = [document.documentElement, document.body].map((element) => [element, element.style.overflow] as const);
    restore.forEach(([element]) => (element.style.overflow = 'hidden'));
    const frame = requestAnimationFrame(() => setOffset(0));
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      restore.forEach(([element, overflow]) => (element.style.overflow = overflow));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // touchmove must be able to stop the page from scrolling: a non-passive listener.
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const onMove = (event: globalThis.TouchEvent) => {
      const state = drag.current;
      if (state.startY === null || state.closing) return;
      const y = event.touches[0].clientY;
      const pulled = y - state.startY;
      if (pulled > 0) {
        event.preventDefault();
        setDragging(true);
        setOffset(pulled);
      }
      const elapsed = event.timeStamp - state.lastTime;
      if (elapsed > 0) state.speed = (y - state.lastY) / elapsed;
      state.lastY = y;
      state.lastTime = event.timeStamp;
    };
    element.addEventListener('touchmove', onMove, { passive: false });
    return () => element.removeEventListener('touchmove', onMove);
  }, []);

  const start = (event: TouchEvent) => {
    const y = event.touches[0].clientY;
    Object.assign(drag.current, { startY: (panel.current?.scrollTop ?? 0) <= 0 ? y : null, lastY: y, lastTime: event.timeStamp, speed: 0 });
  };
  const end = () => {
    const state = drag.current;
    if (state.startY === null || state.closing) return;
    state.startY = null;
    setDragging(false);
    const height = panel.current?.offsetHeight ?? window.innerHeight;
    if (offset > Math.min(CLOSE_PX, height * 0.35) || (offset > 10 && state.speed > FLICK_PX_PER_MS)) close();
    else setOffset(0);
  };

  const height = panel.current?.offsetHeight || window.innerHeight;
  return (
    <>
      <div className="fixed inset-0 z-40 touch-none bg-black/40" style={{ opacity: Math.max(0, 1 - offset / height) }} onClick={close} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-5 pb-[env(safe-area-inset-bottom)] shadow-2xl dark:bg-[#16171b] ${dragging ? '' : 'transition-transform duration-250'}`}
        style={{ transform: `translateY(${offset}px)` }}
        onTouchStart={start}
        onTouchEnd={end}
        onTouchCancel={end}
      >
        <div className="sticky top-0 -mx-5 flex justify-center bg-inherit pt-3 pb-4">
          <div className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>
        {children(close)}
      </div>
    </>
  );
}
