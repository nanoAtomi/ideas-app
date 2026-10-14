import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCommentActions, useComments } from '../api/ideas';
import { formatDate } from './StatusBadge';

/** The talk under a board idea: read, add one, remove your own (admins: any). */
export function Comments({ ideaId }: { ideaId: number }) {
  const { t, i18n } = useTranslation();
  const comments = useComments(ideaId);
  const { add, remove } = useCommentActions(ideaId);
  const [body, setBody] = useState('');

  return (
    <section className="mt-6 border-t border-line pt-5" aria-labelledby={`comments-${ideaId}`}>
      <h3 id={`comments-${ideaId}`} className="font-semibold">
        💬 {t('comments.title')}
      </h3>
      {comments.data?.length === 0 && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('comments.empty')}</p>}
      <ul className="mt-3 space-y-2.5">
        {comments.data?.map((comment) => (
          <li key={comment.id} className={`rounded-2xl px-3.5 py-2.5 text-sm ${comment.mine ? 'bg-orange-50 dark:bg-orange-500/10' : 'bg-ink/[0.04] dark:bg-white/[0.05]'}`}>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-ink">{comment.author_name ?? `🙈 ${t('comments.author')}`}</span>
              {comment.by_idea_author && comment.author_name && <span>· {t('comments.author')}</span>}
              <time dateTime={comment.created_at}>· {formatDate(comment.created_at, i18n.language)}</time>
              {comment.can_delete && (
                <button
                  type="button"
                  onClick={() => remove.mutate(comment.id)}
                  aria-label={t('comments.delete')}
                  className="ml-auto rounded-full px-2 py-0.5 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-line break-words">{comment.body}</p>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) add.mutate(body.trim(), { onSuccess: () => setBody('') });
        }}
      >
        <textarea
          aria-label={t('comments.write')}
          rows={2}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('comments.placeholder')}
          className="min-w-0 flex-1 rounded-2xl border border-line bg-canvas px-3.5 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20"
        />
        <button
          type="submit"
          disabled={!body.trim() || add.isPending}
          className="min-h-11 shrink-0 rounded-full bg-ink px-4 text-sm font-semibold text-canvas disabled:opacity-40"
        >
          {t('comments.send')}
        </button>
      </form>
    </section>
  );
}
