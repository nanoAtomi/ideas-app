import { useTranslation } from 'react-i18next';
import type { Status } from '../api/ideas';

export const STATUS_STYLE: Record<Status, { icon: string; badge: string; dot: string }> = {
  new: { icon: '✨', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
  seen: { icon: '👀', badge: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300', dot: 'bg-violet-500' },
  planned: { icon: '🛠️', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  in_development: { icon: '🧑‍💻', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300', dot: 'bg-orange-500' },
  built: { icon: '🚀', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  not_now: { icon: '💤', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300', dot: 'bg-slate-400' },
};

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useTranslation();
  const style = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
      <span aria-hidden>{style.icon}</span>
      {t(`status.${status}`)}
    </span>
  );
}

/** "13. Okt. 2026" / "Oct 13, 2026" in the active language. */
export function formatDate(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}
