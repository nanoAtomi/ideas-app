import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { isDark, LANGUAGE_NAMES, toggleTheme } from '../prefs';

/*
 * The account menu - the portal's profile panel for React apps (blueprint template;
 * copy into `src/components/` next to the shell you pick: PlatformBar or
 * PlatformSidebar). Same measures, icons and behaviour as the portal and nicasso.de:
 *
 *   (AB) Name / e-mail
 *   [🌐 Deutsch ▾] [☾]        language: system picker on touch, styled list with a mouse
 *   ─────────────
 *   <app items> · Edit profile · Feedback · Sign out
 *
 * A popover on wide screens, an iOS-style bottom sheet on phones (rendered into <body>,
 * so a blurred header can't trap it). Language and appearance are platform-wide
 * (prefs.ts cookies).
 *
 * Texts (de/en): platform.menu, platform.language, platform.toDark, platform.toLight,
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

/** The portal's line icons (portal-ui shared/icon), 24×24 paths. */
const ICONS = {
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0',
  chat: 'M8 10h8M8 14h5M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12Z',
  logout: 'M15 16l4-4m0 0-4-4m4 4H9m4 8H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z',
  sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.4 6.4-.7-.7M6.3 6.3l-.7-.7m12.8 0-.7.7M6.3 17.7l-.7.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20.4 14.5A8.5 8.5 0 0 1 9.5 3.6a8.5 8.5 0 1 0 10.9 10.9Z',
  chevron: 'm6 9 6 6 6-6',
  check: 'm5 12 5 5 9-10',
  cog: 'M10.3 4.3a1.7 1.7 0 0 1 3.4 0l.2.9a1.7 1.7 0 0 0 2.5 1l.8-.4a1.7 1.7 0 0 1 2.4 2.4l-.4.8a1.7 1.7 0 0 0 1 2.5l.9.2a1.7 1.7 0 0 1 0 3.4l-.9.2a1.7 1.7 0 0 0-1 2.5l.4.8a1.7 1.7 0 0 1-2.4 2.4l-.8-.4a1.7 1.7 0 0 0-2.5 1l-.2.9a1.7 1.7 0 0 1-3.4 0l-.2-.9a1.7 1.7 0 0 0-2.5-1l-.8.4a1.7 1.7 0 0 1-2.4-2.4l.4-.8a1.7 1.7 0 0 0-1-2.5l-.9-.2a1.7 1.7 0 0 1 0-3.4l.9-.2a1.7 1.7 0 0 0 1-2.5l-.4-.8a1.7 1.7 0 0 1 2.4-2.4l.8.4a1.7 1.7 0 0 0 2.5-1l.2-.9ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  plus: 'M12 5v14m-7-7h14',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  calendar: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  pen: 'm15 5 4 4M4 20l1-4L16 5l3 3L8 19l-4 1Z',
} as const;
export type IconName = keyof typeof ICONS;

export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

/** Class for app entries passed as `items`, so they match the built-in ones. */
export const menuItemClass = 'flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-[15px] hover:bg-slate-100 dark:hover:bg-white/10';
/** Class for the icon inside such an entry. */
export const menuIconClass = 'size-5 text-slate-500 dark:text-slate-400';

export function initials(name: string): string {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const isPhone = () => !window.matchMedia?.('(min-width: 640px)').matches;
const isTouch = () => !!window.matchMedia?.('(pointer: coarse)').matches;

/**
 * The avatar button and its menu. `trigger` swaps the round avatar for another face
 * (the sidebar's user card); `placement` says where the popover opens.
 */
export function AccountMenu({
  user,
  items,
  trigger,
  placement = 'below-right',
}: {
  user: PlatformUser;
  /** App-specific entries above "Edit profile" (use menuItemClass + Icon). */
  items?: ReactNode;
  trigger?: (initials: string) => ReactNode;
  placement?: 'below-right' | 'above';
}) {
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

  const face = initials(user.name);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('platform.menu')}
        aria-expanded={open !== null}
        onClick={() => setOpen(open ? null : isPhone() ? 'sheet' : 'popover')}
        className={trigger ? 'block w-full text-left' : 'grid size-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white ring-offset-2 hover:ring-2 hover:ring-slate-300 dark:bg-white dark:text-slate-900 dark:ring-offset-[#15161b]'}
      >
        {trigger ? trigger(face) : face}
      </button>
      {open === 'popover' && (
        <div
          className={`absolute z-40 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#1a1b20] ${
            placement === 'above' ? 'right-0 bottom-full left-0 mb-2' : 'top-12 right-0 w-72'
          }`}
        >
          <AccountPanel user={user} items={items} onDone={() => setOpen(null)} />
        </div>
      )}
      {open === 'sheet' &&
        createPortal(
          <BottomSheet label={t('platform.menu')} onClosed={() => setOpen(null)}>
            {(close) => (
              <div className="pb-6">
                <AccountPanel user={user} items={items} onDone={close} />
              </div>
            )}
          </BottomSheet>,
          document.body,
        )}
    </div>
  );
}

/** Who, language + appearance, the app's items, profile, feedback, sign-out. */
export function AccountPanel({ user, items, onDone }: { user: PlatformUser; items?: ReactNode; onDone: () => void }) {
  const { t } = useTranslation();
  const item = menuItemClass;
  return (
    <>
      <div className="flex items-center gap-3 px-1">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-900 text-base font-semibold text-white dark:bg-white dark:text-slate-900">{initials(user.name)}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{user.name}</span>
          {user.email && user.email !== user.name && <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</span>}
        </span>
      </div>
      <div className="mt-5">
        <PrefsRow />
      </div>
      <div className="mt-5 space-y-1 border-t border-slate-200 pt-3 dark:border-white/10" onClick={(event) => (event.target as Element).closest('a') && onDone()}>
        {items}
        {user.portalUrl && (
          <a href={`${user.portalUrl}/profile`} className={item}>
            <Icon name="user" className={menuIconClass} />
            {t('platform.profile')}
          </a>
        )}
        {user.feedbackUrl && (
          <a href={user.feedbackUrl} className={item}>
            <Icon name="chat" className={menuIconClass} />
            {t('platform.feedback')}
          </a>
        )}
        {user.logoutUrl && (
          <a href={user.logoutUrl} className={`${item} text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40`}>
            <Icon name="logout" />
            {t('platform.signOut')}
          </a>
        )}
      </div>
    </>
  );
}

/**
 * Language and one light/dark button (until it is pressed, the device decides). The
 * language opens the system picker on touch screens (the iPhone's wheel) and a styled
 * list with a mouse - more languages are just more entries.
 */
export function PrefsRow() {
  const { t, i18n } = useTranslation();
  const [dark, setDark] = useState(isDark);
  const [open, setOpen] = useState(false);
  const [touch] = useState(isTouch);
  const current = (i18n.resolvedLanguage ?? 'de') as keyof typeof LANGUAGE_NAMES;
  const label = t(dark ? 'platform.toLight' : 'platform.toDark');
  const pick = (code: string) => {
    void i18n.changeLanguage(code);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          aria-label={t('platform.language')}
          aria-haspopup="listbox"
          aria-expanded={open}
          tabIndex={touch ? -1 : undefined}
          aria-hidden={touch || undefined}
          onClick={() => setOpen(!open)}
          className="flex h-11 w-full items-center gap-2.5 rounded-xl bg-slate-100 px-3 text-sm font-medium transition-colors hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:outline-none dark:bg-white/[0.06] dark:hover:bg-white/10"
        >
          <Icon name="globe" className="size-5 text-slate-500 dark:text-slate-400" />
          <span className="flex-1 truncate text-left">{LANGUAGE_NAMES[current] ?? current}</span>
          <Icon name="chevron" className={`size-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {touch ? (
          <select
            aria-label={t('platform.language')}
            value={current}
            onChange={(event) => pick(event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
          >
            {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          open && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
              <div role="listbox" aria-label={t('platform.language')} className="absolute inset-x-0 top-full z-[61] mt-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-[#22232a]">
                {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                  <button
                    key={code}
                    type="button"
                    role="option"
                    aria-selected={code === current}
                    onClick={() => pick(code)}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10 ${code === current ? 'font-semibold' : ''}`}
                  >
                    <span className="flex-1">{name}</span>
                    {code === current && <Icon name="check" className="size-4 text-blue-600 dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            </>
          )
        )}
      </div>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setDark(toggleTheme() === 'dark')}
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10"
      >
        <Icon name={dark ? 'moon' : 'sun'} />
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
 * Render it into document.body (createPortal) - inside a blurred or transformed
 * ancestor, "fixed" would stick to that ancestor instead of the screen.
 */
export function BottomSheet({ label, onClosed, children }: { label: string; onClosed: () => void; children: (close: () => void) => ReactNode }) {
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
