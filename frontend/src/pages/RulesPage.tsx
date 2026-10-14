import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageTitle } from './Pages';

interface Rule {
  icon: string;
  title: string;
  text: string;
}

/** What belongs on the board and what admins change or take down - linked from the wizard. */
export function RulesPage() {
  const { t } = useTranslation();
  const rules = t('rules.items', { returnObjects: true }) as Rule[];
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t('rules.title')} lead={t('rules.lead')} />
      <ul className="space-y-3">
        {rules.map((rule) => (
          <li key={rule.title} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
            <span aria-hidden className="text-2xl leading-none">
              {rule.icon}
            </span>
            <span>
              <span className="block font-semibold">{rule.title}</span>
              <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">{rule.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{t('rules.admins')}</p>
      <Link to="/submit" className="mt-6 inline-block rounded-full bg-gradient-to-r from-spark-from to-spark-to px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/25">
        💡 {t('nav.submit')}
      </Link>
    </div>
  );
}
