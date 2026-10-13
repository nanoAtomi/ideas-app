import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Wider panel (admin details). */
  wide?: boolean;
}

/** Bottom sheet on phones, centred card on desktop. Closes on backdrop tap or Escape. */
export function Dialog({ title, onClose, children, wide = false }: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label={t('common.close')} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] dark:bg-black/60" />
      <div
        className={`relative max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] bg-surface px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px] sm:px-7 sm:pt-6 ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="-mr-2 -mt-1 hidden size-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-ink/5 sm:grid dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
