import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';
import type { Me } from '../api/me';
import type { Language } from '../i18n';
import { LanguageSwitch } from './LanguageSwitch';

interface Props {
  me: Me;
  onLanguageChange: (language: Language) => void;
}

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-ink/5 text-ink dark:bg-white/10' : 'text-slate-500 hover:text-ink dark:text-slate-400'
  }`;

/**
 * App bar with the platform links every portal app offers: "← Portal" (PORTAL_URL),
 * Feedback and "Sign out" (PORTAL_LOGOUT_URL - signs out of every app at once).
 * Desktop shows everything inline; phones get the views in the bottom nav and the
 * rest in a small menu.
 */
export function AppHeader({ me, onLanguageChange }: Props) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:py-3">
        {me.portal_url && (
          <a
            href={me.portal_url}
            title={t('header.portalTitle')}
            className="-ml-1 rounded-full px-2 py-1.5 text-sm text-slate-500 hover:text-ink dark:text-slate-400"
          >
            ←<span className="hidden sm:inline"> {t('header.portal')}</span>
          </a>
        )}
        <Link to="/" className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-spark-from to-spark-to text-base shadow-sm shadow-orange-500/30"
          >
            💡
          </span>
          <span className="text-lg font-bold tracking-tight">{t('app.name')}</span>
        </Link>

        <nav aria-label={t('nav.main')} className="ml-4 hidden items-center gap-1 sm:flex">
          <NavLink to="/" end className={navLink}>
            {t('nav.discover')}
          </NavLink>
          <NavLink to="/mine" className={navLink}>
            {t('nav.mine')}
          </NavLink>
          {me.is_admin && (
            <NavLink to="/admin" className={navLink}>
              {t('nav.admin')}
            </NavLink>
          )}
        </nav>

        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <Link
            to="/submit"
            className="rounded-full bg-gradient-to-r from-spark-from to-spark-to px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:brightness-105"
          >
            💡 {t('nav.submit')}
          </Link>
          <LanguageSwitch onChange={onLanguageChange} />
          {me.feedback_url && (
            <a href={me.feedback_url} className="text-sm text-slate-500 hover:text-ink dark:text-slate-400">
              {t('header.feedback')}
            </a>
          )}
          {me.logout_url && (
            <a href={me.logout_url} className="rounded-full border border-line px-3.5 py-1.5 text-sm hover:bg-ink/5 dark:hover:bg-white/10">
              {t('header.signOut')}
            </a>
          )}
        </div>

        <PhoneMenu me={me} onLanguageChange={onLanguageChange} />
      </div>
    </header>
  );
}

function PhoneMenu({ me, onLanguageChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const item = 'block rounded-xl px-3 py-3 text-[15px] hover:bg-ink/5 dark:hover:bg-white/10';
  return (
    <div ref={ref} className="relative ml-auto sm:hidden">
      <button
        type="button"
        aria-label={t('header.menu')}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid size-11 place-items-center rounded-full text-xl hover:bg-ink/5 dark:hover:bg-white/10"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-60 rounded-2xl border border-line bg-surface p-2 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">{t('header.language')}</span>
            <LanguageSwitch onChange={onLanguageChange} />
          </div>
          {me.is_admin && (
            <Link to="/admin" className={item} onClick={() => setOpen(false)}>
              🗂️ {t('nav.admin')}
            </Link>
          )}
          {me.feedback_url && (
            <a href={me.feedback_url} className={item}>
              💬 {t('header.feedback')}
            </a>
          )}
          {me.logout_url && (
            <a href={me.logout_url} className={item}>
              👋 {t('header.signOut')}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
