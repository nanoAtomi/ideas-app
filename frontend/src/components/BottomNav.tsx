import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

const tab = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] ${
    isActive ? 'font-semibold text-ink' : 'text-slate-500 dark:text-slate-400'
  }`;

/** Phones: thumb-reach navigation with the big 💡 "submit" button in the middle. */
export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-20 flex items-end border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
    >
      <NavLink to="/" end className={tab}>
        <span aria-hidden className="text-xl leading-none">🧭</span>
        {t('nav.discover')}
      </NavLink>
      {/* Admins: their notebook and the board, one on each side of the big button. */}
      {/* reloadDocument: a full load, so "Add to Home Screen" on iOS takes the notebook's own icon. */}
      {isAdmin && (
        <NavLink to="/quick" reloadDocument className={tab}>
          <span aria-hidden className="text-xl leading-none">✍️</span>
          {t('quick.short')}
        </NavLink>
      )}
      <NavLink to="/submit" aria-label={t('nav.submit')} className="flex flex-1 flex-col items-center gap-0.5 pb-1.5 text-[11px] font-semibold">
        <span
          aria-hidden
          className="-mt-6 grid size-14 place-items-center rounded-full bg-gradient-to-br from-spark-from to-spark-to text-2xl shadow-lg shadow-orange-500/40 ring-4 ring-canvas"
        >
          💡
        </span>
        {t('nav.submitShort')}
      </NavLink>
      <NavLink to="/mine" className={tab}>
        <span aria-hidden className="text-xl leading-none">📬</span>
        {t('nav.mine')}
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={tab}>
          <span aria-hidden className="text-xl leading-none">🗂️</span>
          {t('nav.admin')}
        </NavLink>
      )}
    </nav>
  );
}
