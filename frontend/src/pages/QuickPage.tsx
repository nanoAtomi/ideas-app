import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { EMPTY_IDEA, useConcerns, useIdeaActions } from '../api/ideas';
import { LIMITS } from '../components/IdeaInputs';
import { useHomeScreenIdentity } from '../homeScreen';

/**
 * The admin's notebook in seconds: one field, which app it is for, save. Saved as a
 * private idea (only admins see it), so it lands on the admin board with versions like
 * any other. Added to the phone's home screen from here, it opens straight into this
 * page (useHomeScreenIdentity swaps in its own manifest and icon).
 */
export function QuickPage({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  useHomeScreenIdentity({ manifest: '/quick.webmanifest', icon: '/icons/quick-180.png', title: 'Idee +' });
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-[28px] border border-line bg-surface p-6 text-center shadow-sm">
        <p className="font-semibold">{t('quick.adminsOnly')}</p>
        <Link to="/submit" className="mt-4 inline-block rounded-full bg-gradient-to-r from-spark-from to-spark-to px-5 py-3 text-sm font-semibold text-white">
          💡 {t('nav.submit')}
        </Link>
      </div>
    );
  }
  return <QuickForm />;
}

function QuickForm() {
  const { t } = useTranslation();
  const { submit } = useIdeaActions();
  const known = useConcerns().data ?? [];
  const [text, setText] = useState('');
  const [concerns, setConcerns] = useState<string | null>(null);
  const [other, setOther] = useState(false);
  const [saved, setSaved] = useState(0);
  const field = useRef<HTMLTextAreaElement>(null);

  const save = () =>
    submit.mutate(
      { ...EMPTY_IDEA, problem: text.trim(), concerns, visibility: 'private' },
      {
        onSuccess: () => {
          setText('');
          setSaved((n) => n + 1);
          field.current?.focus();
        },
      },
    );
  const chip = (active: boolean) =>
    `min-h-10 rounded-full border px-3.5 text-sm transition ${
      active ? 'border-orange-400 bg-orange-50 font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' : 'border-line hover:border-orange-300'
    }`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) save();
      }}
      className="mx-auto max-w-xl rounded-[28px] border border-line bg-surface p-5 shadow-sm sm:p-7"
    >
      <h1 className="text-xl font-bold tracking-tight">{t('quick.title')}</h1>
      <textarea
        ref={field}
        aria-label={t('quick.title')}
        autoFocus
        rows={5}
        maxLength={LIMITS.problem}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('quick.placeholder')}
        className="mt-3 w-full rounded-2xl border border-line bg-canvas px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20"
      />

      <p className="mt-4 text-sm font-semibold">{t('quick.for')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => { setConcerns(null); setOther(false); }} aria-pressed={concerns === null && !other} className={chip(concerns === null && !other)}>
          ✨ {t('concerns.new')}
        </button>
        {known.map((name) => (
          <button key={name} type="button" onClick={() => { setConcerns(name); setOther(false); }} aria-pressed={concerns === name && !other} className={chip(concerns === name && !other)}>
            🧩 {name}
          </button>
        ))}
        <button type="button" onClick={() => { setOther(true); setConcerns(null); }} aria-pressed={other} className={chip(other)}>
          ＋ {t('quick.otherApp')}
        </button>
      </div>
      {other && (
        <input
          aria-label={t('concerns.appName')}
          autoFocus
          maxLength={LIMITS.concerns}
          value={concerns ?? ''}
          onChange={(e) => setConcerns(e.target.value.trim() ? e.target.value : null)}
          placeholder={t('concerns.placeholder')}
          className="mt-3 w-full rounded-2xl border border-line bg-canvas px-4 py-3 outline-none focus:border-orange-400"
        />
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <span role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {saved > 0 && !text && `✓ ${t('quick.saved', { count: saved })}`}
          {submit.isError && <span className="text-red-700 dark:text-red-400">{t('wizard.sendFailed')}</span>}
        </span>
        <button
          type="submit"
          disabled={!text.trim() || submit.isPending}
          className="min-h-12 rounded-full bg-gradient-to-r from-spark-from to-spark-to px-6 text-base font-semibold text-white shadow-md shadow-orange-500/25 disabled:opacity-40"
        >
          {t('quick.save')}
        </button>
      </div>
      <p className="mt-5 border-t border-line pt-4 text-xs text-slate-500 dark:text-slate-400">
        🔒 {t('quick.privateHint')} · <Link to="/admin" className="font-semibold hover:underline">{t('nav.admin')}</Link>
      </p>
    </form>
  );
}
