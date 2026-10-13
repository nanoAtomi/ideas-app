import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useIdeaActions, useMyIdeas, type Idea } from '../api/ideas';
import { Dialog } from '../components/Dialog';
import { EmptyState } from '../components/EmptyState';
import { ImageStrip } from '../components/Images';
import { formatDate, StatusBadge } from '../components/StatusBadge';
import { PageTitle } from './Pages';

/** The author's own ideas with status, visibility and the admin's reply. */
export function MinePage() {
  const { t } = useTranslation();
  const ideas = useMyIdeas();
  const [deleting, setDeleting] = useState<Idea | null>(null);

  return (
    <>
      <PageTitle title={t('mine.title')} lead={ideas.data?.length ? t('mine.lead', { count: ideas.data.length }) : undefined} />
      {ideas.isPending && <p className="text-slate-500">{t('loading')}</p>}
      {ideas.isError && <p className="text-red-700 dark:text-red-400">{t('error.load', { message: ideas.error.message })}</p>}
      {ideas.data?.length === 0 && (
        <EmptyState icon="📬" title={t('mine.emptyTitle')} text={t('mine.emptyText')}>
          <Link to="/submit" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-canvas">
            💡 {t('nav.submit')}
          </Link>
        </EmptyState>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {ideas.data?.map((idea) => (
          <li key={idea.id}>
            <IdeaCard idea={idea} onDelete={() => setDeleting(idea)} />
          </li>
        ))}
      </ul>
      {deleting && <DeleteDialog idea={deleting} onClose={() => setDeleting(null)} />}
    </>
  );
}

function IdeaCard({ idea, onDelete }: { idea: Idea; onDelete: () => void }) {
  const { t, i18n } = useTranslation();
  return (
    <article className="flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={idea.status} />
        <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {t(`visibility.${idea.visibility}.icon`)} {t(`visibility.${idea.visibility}.short`)}
        </span>
        {idea.visibility === 'board' && idea.anonymous && (
          <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">🙈 {t('visibility.anonymous.short')}</span>
        )}
        <time dateTime={idea.created_at} className="ml-auto text-xs text-slate-400">
          {formatDate(idea.created_at, i18n.language)}
        </time>
      </div>
      <h2 className="mt-3 text-lg font-bold tracking-tight">{idea.name_idea ?? t('mine.untitled')}</h2>
      <p className="mt-1 line-clamp-3 whitespace-pre-line text-slate-600 dark:text-slate-300">{idea.problem}</p>
      <ImageStrip links={idea.image_links} size="sm" />

      {idea.admin_reply && (
        <div className="mt-4 rounded-2xl rounded-tl-md bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-sm dark:from-amber-500/10 dark:to-orange-500/10">
          <p className="font-semibold text-orange-800 dark:text-orange-300">💬 {t('mine.reply')}</p>
          <p className="mt-1 whitespace-pre-line">{idea.admin_reply}</p>
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-4">
        <Link to={`/mine/${idea.id}/edit`} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-ink/5 dark:hover:bg-white/10">
          ✏️ {t('mine.edit')}
        </Link>
        <button onClick={onDelete} className="rounded-full px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
          {t('mine.delete')}
        </button>
      </div>
    </article>
  );
}

/** Says honestly that admins keep seeing a deleted idea (plan: F13). */
function DeleteDialog({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const { t } = useTranslation();
  const { remove } = useIdeaActions();
  return (
    <Dialog title={t('mine.deleteTitle')} onClose={onClose}>
      <p className="text-slate-600 dark:text-slate-300">{t('mine.deleteText')}</p>
      {remove.isError && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{t('error.load', { message: remove.error.message })}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-ink/5 dark:hover:bg-white/10">
          {t('common.cancel')}
        </button>
        <button
          onClick={() => remove.mutate(idea.id, { onSuccess: onClose })}
          disabled={remove.isPending}
          className="rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {t('mine.deleteConfirm')}
        </button>
      </div>
    </Dialog>
  );
}
