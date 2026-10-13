import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router-dom';
import { ApiError } from './api/client';
import { useMe, useUpdateMe } from './api/me';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import type { Language } from './i18n';
import { AdminPage } from './pages/AdminPage';
import { EditPage } from './pages/EditPage';
import { MinePage } from './pages/MinePage';
import { DiscoverPage } from './pages/DiscoverPage';
import { SubmitPage } from './pages/SubmitPage';

export function App() {
  const { t, i18n } = useTranslation();
  const me = useMe();
  const updateMe = useUpdateMe();

  // A language saved on the server (other device) wins over the browser default.
  useEffect(() => {
    if (me.data?.language && me.data.language !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(me.data.language);
    }
  }, [me.data?.language, i18n]);

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

  const changeLanguage = (language: Language) => {
    void i18n.changeLanguage(language);
    updateMe.mutate({ language });
  };

  return (
    <>
      <AppHeader me={me.data} onLanguageChange={changeLanguage} />
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:py-8">
        <Routes>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/mine" element={<MinePage />} />
          <Route path="/mine/:ideaId/edit" element={<EditPage />} />
          <Route path="/admin" element={<AdminPage isAdmin={me.data.is_admin} />} />
          <Route path="*" element={<DiscoverPage />} />
        </Routes>
        <footer className="mt-12 text-center text-xs text-slate-400">
          <a href="/privacy/" className="hover:text-ink">
            {t('footer.privacy')}
          </a>
        </footer>
      </main>
      <BottomNav />
    </>
  );
}
