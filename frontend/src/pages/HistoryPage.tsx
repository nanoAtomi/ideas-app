import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useRestore, useVersions, type IdeaFields, type IdeaVersion } from '../api/ideas';
import { Dialog } from '../components/Dialog';
import { formatDate } from '../components/StatusBadge';
import { PageTitle } from './Pages';

/** The fields in the order of the wizard. */
const FIELDS: (keyof IdeaFields)[] = ['concerns', 'name_idea', 'problem', 'audience', 'frequency', 'helps', 'details', 'image_links', 'visibility', 'anonymous'];

/**
 * Every saved state of an idea, newest first: who changed what and why. Two versions
 * can be compared side by side (changes marked) and an older one restored - which
 * adds a new version, so nothing is ever lost. Authors see their own ideas; admins
 * any idea, and they give a reason when restoring.
 */
export function HistoryPage({ admin = false }: { admin?: boolean }) {
  const { t } = useTranslation();
  const id = Number(useParams().ideaId);
  const versions = useVersions(id, admin);
  const back = admin ? '/admin' : '/mine';

  return (
    <div className="mx-auto max-w-4xl">
      <Link to={back} className="mb-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink dark:text-slate-400">
        ← {admin ? t('nav.admin') : t('nav.mine')}
      </Link>
      <PageTitle title={t('history.title')} lead={t('history.lead')} />
      {versions.isPending && <p className="text-slate-500">{t('loading')}</p>}
      {versions.isError && <p className="text-red-700 dark:text-red-400">{t('edit.notFound')}</p>}
      {versions.data && <History id={id} admin={admin} versions={versions.data} />}
    </div>
  );
}

function History({ id, admin, versions }: { id: number; admin: boolean; versions: IdeaVersion[] }) {
  const { t, i18n } = useTranslation();
  const latest = versions[0];
  // Compare the newest with the one before - or, with a single version, itself.
  const [left, setLeft] = useState(versions[1]?.number ?? latest.number);
  const [right, setRight] = useState(latest.number);
  const [restoring, setRestoring] = useState<IdeaVersion | null>(null);
  const byNumber = (n: number) => versions.find((v) => v.number === n) ?? latest;

  const who = (v: IdeaVersion) => (v.by_admin ? (v.editor_name ? `${v.editor_name} (${t('history.admin')})` : t('history.anAdmin')) : (v.editor_name ?? t('history.author')));
  const select = 'rounded-xl border border-line bg-surface px-3 py-2 text-sm';

  return (
    <>
      <ol className="space-y-2">
        {versions.map((v) => (
          <li key={v.number} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-line bg-surface p-3.5 text-sm">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/5 text-xs font-bold dark:bg-white/10">v{v.number}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {who(v)} · <time dateTime={v.created_at}>{formatDate(v.created_at, i18n.language)}</time>
              </span>
              <span className="block text-slate-500 dark:text-slate-400">
                {v.number === 1 && v.changed.length === 0 ? t('history.created') : v.changed.map((field) => t(`history.fields.${field}`)).join(', ')}
              </span>
              {v.reason && <span className="mt-1 block rounded-xl bg-amber-50 px-3 py-1.5 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">🛡️ {v.reason}</span>}
            </span>
            {v.number === latest.number ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">{t('history.current')}</span>
            ) : (
              <button type="button" onClick={() => setRestoring(v)} className="min-h-10 rounded-full border border-line px-3.5 text-sm font-semibold hover:bg-ink/5 dark:hover:bg-white/10">
                ↩ {t('history.restore')}
              </button>
            )}
          </li>
        ))}
      </ol>

      {versions.length > 1 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <h2 className="mr-1 text-lg font-bold">{t('history.compare')}</h2>
            <select aria-label={t('history.older')} value={left} onChange={(e) => setLeft(Number(e.target.value))} className={select}>
              {versions.map((v) => (
                <option key={v.number} value={v.number}>
                  v{v.number}
                </option>
              ))}
            </select>
            <span aria-hidden>→</span>
            <select aria-label={t('history.newer')} value={right} onChange={(e) => setRight(Number(e.target.value))} className={select}>
              {versions.map((v) => (
                <option key={v.number} value={v.number}>
                  v{v.number}
                </option>
              ))}
            </select>
          </div>
          <Compare left={byNumber(left)} right={byNumber(right)} />
        </section>
      )}

      {restoring && <RestoreDialog id={id} admin={admin} version={restoring} onClose={() => setRestoring(null)} />}
    </>
  );
}

/** Side by side on wide screens, one under the other on phones; changed fields marked. */
function Compare({ left, right }: { left: IdeaVersion; right: IdeaVersion }) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const differs = (field: keyof IdeaFields) => JSON.stringify(left.fields[field] ?? null) !== JSON.stringify(right.fields[field] ?? null);
  const shown = FIELDS.filter((field) => all || differs(field));

  return (
    <div className="mt-4">
      {shown.length === 0 && <p className="rounded-2xl border border-line p-4 text-sm text-slate-500">{t('history.same')}</p>}
      <dl className="space-y-3">
        {shown.map((field) => (
          <div key={field} className="rounded-2xl border border-line bg-surface p-3.5">
            <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t(`history.fields.${field}`)}</dt>
            <dd className="grid gap-2 sm:grid-cols-2">
              <Value label={`v${left.number}`} value={left.fields[field]} field={field} tone={differs(field) ? 'old' : 'same'} />
              <Value label={`v${right.number}`} value={right.fields[field]} field={field} tone={differs(field) ? 'new' : 'same'} />
            </dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={() => setAll(!all)} className="mt-3 text-sm font-semibold text-orange-700 hover:underline dark:text-orange-300">
        {all ? t('history.onlyChanges') : t('history.allFields')}
      </button>
    </div>
  );
}

function Value({ label, value, field, tone }: { label: string; value: unknown; field: keyof IdeaFields; tone: 'old' | 'new' | 'same' }) {
  const { t } = useTranslation();
  const toneClass = {
    old: 'bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-100',
    new: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100',
    same: 'bg-ink/[0.03] dark:bg-white/[0.04]',
  }[tone];
  let text: string;
  if (field === 'concerns') text = value ? `🧩 ${String(value)}` : `✨ ${t('concerns.new')}`;
  else if (field === 'frequency') text = value ? t(`frequency.${String(value)}.label`) : '';
  else if (field === 'visibility') text = t(`visibility.${String(value)}.short`);
  else if (field === 'anonymous') text = value ? t('history.yes') : t('history.no');
  else if (field === 'image_links') text = (value as string[] | null)?.join('\n') ?? '';
  else text = value ? String(value) : '';
  return (
    <div className={`rounded-xl px-3 py-2 text-sm ${toneClass}`}>
      <span className="mb-0.5 block text-[11px] font-bold opacity-60">{label}</span>
      <span className={`block whitespace-pre-line break-words ${text ? '' : 'italic opacity-50'}`}>{text || t('wizard.skipped')}</span>
    </div>
  );
}

function RestoreDialog({ id, admin, version, onClose }: { id: number; admin: boolean; version: IdeaVersion; onClose: () => void }) {
  const { t } = useTranslation();
  const restore = useRestore(id, admin);
  const [reason, setReason] = useState(t('history.restoredReason', { n: version.number }));
  const valid = !admin || reason.trim().length >= 3;
  return (
    <Dialog title={t('history.restoreTitle', { n: version.number })} onClose={onClose}>
      <p className="text-slate-600 dark:text-slate-300">{t('history.restoreText')}</p>
      {admin && (
        <label className="mt-4 block text-sm font-semibold">
          {t('adminEdit.reason')}
          <input
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-line bg-canvas px-4 py-3 font-normal outline-none focus:border-orange-400"
          />
        </label>
      )}
      {restore.isError && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{t('error.load', { message: restore.error.message })}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-ink/5 dark:hover:bg-white/10">
          {t('common.cancel')}
        </button>
        <button
          onClick={() => restore.mutate({ number: version.number, reason: reason.trim() }, { onSuccess: onClose })}
          disabled={!valid || restore.isPending}
          className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-canvas disabled:opacity-40"
        >
          ↩ {t('history.restore')}
        </button>
      </div>
    </Dialog>
  );
}
