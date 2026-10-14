import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ideaFields, useAdminActions, useAdminIdeas, useIdea, useIdeaActions, type Idea, type IdeaFields } from '../api/ideas';
import { STEPS, StepInput } from '../components/IdeaInputs';
import { imageLinksValid } from '../components/Images';
import { PageTitle } from './Pages';

/**
 * All wizard questions on one page, for changing an idea later - by its author, or by
 * an admin (any idea) with a reason the author gets to see (missing details, or
 * against the rules). Every save keeps a version.
 */
export function EditPage({ admin = false }: { admin?: boolean }) {
  const { t } = useTranslation();
  const id = Number(useParams().ideaId);
  // Admins find the idea in the board list they already loaded.
  const own = useIdea(id, !admin);
  const all = useAdminIdeas(admin);
  const query = admin ? all : own;
  const idea = admin ? all.data?.find((i) => i.id === id) : own.data;

  if (query.isPending) return <p className="text-slate-500">{t('loading')}</p>;
  if (!idea) {
    return (
      <p className="text-red-700 dark:text-red-400">
        {t('edit.notFound')}{' '}
        <Link to={admin ? '/admin' : '/mine'} className="underline">
          {admin ? t('nav.admin') : t('nav.mine')}
        </Link>
      </p>
    );
  }
  return <EditForm idea={idea} admin={admin} />;
}

function EditForm({ idea, admin }: { idea: Idea; admin: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const own = useIdeaActions().edit;
  const adminEdit = useAdminActions().edit;
  const save = admin ? adminEdit : own;
  const [fields, setFields] = useState<IdeaFields>(() => ideaFields(idea));
  const [reason, setReason] = useState('');
  const back = admin ? '/admin' : '/mine';
  const valid = fields.problem.trim() !== '' && imageLinksValid(fields.image_links) && (!admin || reason.trim().length >= 3);
  const reasons = t('adminEdit.reasons', { returnObjects: true }) as string[];

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={back} className="mb-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink dark:text-slate-400">
        ← {admin ? t('nav.admin') : t('nav.mine')}
      </Link>
      <PageTitle title={admin ? t('adminEdit.title') : t('edit.title')} lead={admin ? t('adminEdit.lead') : undefined} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          const done = { onSuccess: () => navigate(back) };
          if (admin) adminEdit.mutate({ ...fields, id: idea.id, reason: reason.trim() }, done);
          else own.mutate({ ...fields, id: idea.id }, done);
        }}
        className="space-y-7 rounded-[28px] border border-line bg-surface p-5 shadow-sm sm:p-8"
      >
        {STEPS.map((step) => (
          <section key={step}>
            <h2 className="mb-2.5 font-semibold">{t(`steps.${step}.question`)}</h2>
            <StepInput step={step} value={fields} onChange={(update) => setFields({ ...fields, ...update })} />
          </section>
        ))}

        {admin && (
          <section className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10">
            <label htmlFor="edit-reason" className="font-semibold">
              🛡️ {t('adminEdit.reason')}
            </label>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{t('adminEdit.reasonHint')}</p>
            <input
              id="edit-reason"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              className="mt-3 w-full rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {reasons.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => setReason(text)}
                  aria-pressed={reason === text}
                  className={`rounded-full border px-3 py-1.5 text-sm ${reason === text ? 'border-orange-400 bg-white dark:bg-orange-500/15' : 'border-amber-200 dark:border-amber-500/30'}`}
                >
                  {text}
                </button>
              ))}
            </div>
            <Link to="/rules" className="mt-3 inline-block text-sm font-semibold text-orange-700 hover:underline dark:text-orange-300">
              📜 {t('rules.link')}
            </Link>
          </section>
        )}

        {save.isError && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {t('wizard.sendFailed')}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Link to={back} className="rounded-full px-4 py-3 text-sm font-semibold hover:bg-ink/5 dark:hover:bg-white/10">
            {t('common.cancel')}
          </Link>
          <button
            type="submit"
            disabled={!valid || save.isPending}
            className="rounded-full bg-gradient-to-r from-spark-from to-spark-to px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/25 disabled:opacity-40"
          >
            {t('edit.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
