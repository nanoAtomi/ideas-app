import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ApiError } from './api/client';
import { useMe } from './api/me';
import { BottomNav } from './components/BottomNav';
import { menuItemClass, PlatformBar } from './components/PlatformBar';
import { EditPage } from './pages/EditPage';
import { HistoryPage } from './pages/HistoryPage';
import { MinePage } from './pages/MinePage';
import { DiscoverPage } from './pages/DiscoverPage';
import { QuickPage } from './pages/QuickPage';
import { RulesPage } from './pages/RulesPage';
import { SubmitPage } from './pages/SubmitPage';

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-ink/5 text-ink dark:bg-white/10' : 'text-slate-500 hover:text-ink dark:text-slate-400'
  }`;

const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

export function App() {
  const { t, i18n } = useTranslation();
  const me = useMe();
  // The quick-capture page is a tool of its own: no bottom nav, no footer.
  const quick = useLocation().pathname === '/quick';

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? 'en';
  }, [i18n.resolvedLanguage]);

  if (me.isPending) {
    return <p className="p-6 text-slate-500">{t('loading')}</p>;
  }
  if (me.isError) {
    const notSignedIn = me.error instanceof ApiError && me.error.status === 401;
    return (
      <div className="p-6">
        <p className="text-red-700 dark:text-red-400">
          {notSignedIn ? t('error.notSignedIn') : t('error.load', { message: me.error.message })}
        </p>
        <button onClick={() => window.location.reload()} className="mt-3 rounded-full border border-line px-4 py-2 text-sm">
          {t('error.retry')}
        </button>
      </div>
    );
  }

  return (
    <>
      <PlatformBar
        appName={t('app.name')}
        appIcon={
          <span aria-hidden className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-spark-from to-spark-to text-base shadow-sm shadow-orange-500/30">
            💡
          </span>
        }
        user={{
          name: me.data.display_name,
          email: me.data.email,
          portalUrl: me.data.portal_url,
          logoutUrl: me.data.logout_url,
          feedbackUrl: me.data.feedback_url,
        }}
        navLabel={t('nav.main')}
        nav={
          <>
            <NavLink to="/" end className={navLink}>
              {t('nav.discover')}
            </NavLink>
            <NavLink to="/mine" className={navLink}>
              {t('nav.mine')}
            </NavLink>
            {me.data.is_admin && (
              <NavLink to="/admin" className={navLink}>
                {t('nav.admin')}
              </NavLink>
            )}
          </>
        }
        menuItems={
          me.data.is_admin && (
            <>
              <Link to="/quick" className={menuItemClass}>
                ✍️ {t('quick.menu')}
              </Link>
              <Link to="/admin" className={`${menuItemClass} sm:hidden`}>
                🗂️ {t('nav.admin')}
              </Link>
            </>
          )
        }
        actions={
          <Link
            to="/submit"
            className="rounded-full bg-gradient-to-r from-spark-from to-spark-to px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:brightness-105"
          >
            💡 {t('nav.submit')}
          </Link>
        }
      />
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:py-8">
        <Routes>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/mine" element={<MinePage />} />
          <Route path="/mine/:ideaId/edit" element={<EditPage />} />
          <Route path="/mine/:ideaId/history" element={<HistoryPage />} />
          <Route path="/admin/ideas/:ideaId/edit" element={me.data.is_admin ? <EditPage admin /> : <DiscoverPage />} />
          <Route path="/admin/ideas/:ideaId/history" element={me.data.is_admin ? <HistoryPage admin /> : <DiscoverPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/quick" element={<QuickPage isAdmin={me.data.is_admin} />} />
          <Route
            path="/admin"
            element={
              <Suspense fallback={<p className="text-slate-500">{t('loading')}</p>}>
                <AdminPage isAdmin={me.data.is_admin} />
              </Suspense>
            }
          />
          <Route path="*" element={<DiscoverPage />} />
        </Routes>
        {!quick && (
          <footer className="mt-12 flex justify-center gap-4 text-xs text-slate-400">
            <Link to="/rules" className="hover:text-ink">
              {t('rules.title')}
            </Link>
            <a href="/privacy/" className="hover:text-ink">
              {t('footer.privacy')}
            </a>
          </footer>
        )}
      </main>
      {!quick && <BottomNav />}
    </>
  );
}
