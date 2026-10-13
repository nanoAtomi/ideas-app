import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

// The board itself (votes, visibility) follows in P2 (docs/plan.md).

export function DiscoverPage() {
  const { t } = useTranslation();
  return (
    <>
      <section className="relative mb-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-spark-from to-spark-to px-6 py-10 text-white shadow-xl shadow-orange-500/20 sm:px-10 sm:py-14">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-white/15 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-6 right-8 text-[120px] leading-none opacity-25 sm:text-[160px]">
          💡
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">{t('discover.kicker')}</p>
        <h1 className="mt-2 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">{t('discover.title')}</h1>
        <p className="mt-3 max-w-lg text-white/90">{t('discover.lead')}</p>
        <Link
          to="/submit"
          className="mt-6 inline-block rounded-full bg-white px-5 py-3 text-sm font-semibold text-orange-600 shadow-md transition hover:shadow-lg"
        >
          {t('discover.cta')} →
        </Link>
      </section>
      <EmptyState icon="🌱" title={t('discover.emptyTitle')} text={t('discover.emptyText')} />
    </>
  );
}

export function PageTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {lead && <p className="mt-1.5 text-slate-500 dark:text-slate-400">{lead}</p>}
    </div>
  );
}
