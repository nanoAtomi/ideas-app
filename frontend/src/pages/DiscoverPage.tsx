import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useBoard, useVote, type BoardIdea, type BoardSort } from '../api/ideas';
import { Dialog } from '../components/Dialog';
import { EmptyState } from '../components/EmptyState';
import { ImageStrip } from '../components/Images';
import { formatDate, StatusBadge } from '../components/StatusBadge';

/** The idea board: everything people put "on the board", to browse and vote on. */
export function DiscoverPage() {
  const { t } = useTranslation();
  const [sort, setSort] = useState<BoardSort>('votes');
  const board = useBoard(sort);
  const [openId, setOpenId] = useState<number | null>(null);
  const open = board.data?.find((idea) => idea.id === openId) ?? null;

  return (
    <>
      <section className="relative mb-7 overflow-hidden rounded-[28px] bg-gradient-to-br from-spark-from to-spark-to px-6 py-8 text-white shadow-xl shadow-orange-500/20 sm:px-10 sm:py-11">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-white/15 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-6 right-8 text-[110px] leading-none opacity-25 sm:text-[150px]">
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

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">
          {t('discover.boardTitle')}
          {board.data && board.data.length > 0 && <span className="ml-2 text-sm font-normal text-slate-500">{board.data.length}</span>}
        </h2>
        <div role="group" aria-label={t('discover.sort')} className="flex rounded-full border border-line p-0.5 text-sm font-semibold">
          {(['votes', 'new'] as BoardSort[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={sort === option}
              onClick={() => setSort(option)}
              className={`rounded-full px-3.5 py-1.5 transition-colors ${sort === option ? 'bg-ink text-canvas' : 'text-slate-500 hover:text-ink dark:text-slate-400'}`}
            >
              {t(`discover.sortBy.${option}`)}
            </button>
          ))}
        </div>
      </div>

      {board.isPending && <p className="text-slate-500">{t('loading')}</p>}
      {board.isError && <p className="text-red-700 dark:text-red-400">{t('error.load', { message: board.error.message })}</p>}
      {board.data?.length === 0 && <EmptyState icon="🌱" title={t('discover.emptyTitle')} text={t('discover.emptyText')} />}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {board.data?.map((idea) => (
          <li key={idea.id}>
            <BoardCard idea={idea} onOpen={() => setOpenId(idea.id)} />
          </li>
        ))}
      </ul>

      {open && <IdeaDialog idea={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function BoardCard({ idea, onOpen }: { idea: BoardIdea; onOpen: () => void }) {
  const { t, i18n } = useTranslation();
  return (
    <article
      onClick={onOpen}
      className="group flex h-full cursor-pointer flex-col rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md dark:hover:border-orange-500/30"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold leading-snug tracking-tight">
          <button type="button" onClick={onOpen} className="text-left outline-none focus-visible:underline">
            {idea.name_idea ?? t('mine.untitled')}
          </button>
        </h3>
        {idea.status !== 'new' && <StatusBadge status={idea.status} />}
      </div>
      <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-slate-600 dark:text-slate-300">{idea.problem}</p>
      <ImageStrip links={idea.image_links} size="sm" />
      <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-slate-500 dark:text-slate-400">
        <span>{idea.author_name ? idea.author_name : `🙈 ${t('visibility.anonymous.short')}`}</span>
        <span>· {formatDate(idea.created_at, i18n.language)}</span>
        {idea.frequency && <span title={t(`frequency.${idea.frequency}.label`)}>· {t(`frequency.${idea.frequency}.icon`)}</span>}
        <span className="ml-auto">
          <VoteButton idea={idea} />
        </span>
      </div>
    </article>
  );
}

function VoteButton({ idea }: { idea: BoardIdea }) {
  const { t } = useTranslation();
  const vote = useVote();
  if (idea.mine) {
    return (
      <span title={t('discover.ownIdea')} className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1.5 text-sm font-semibold dark:bg-white/10">
        👍 {idea.votes}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={idea.voted}
      aria-label={t(idea.voted ? 'discover.unvote' : 'discover.vote', { count: idea.votes })}
      onClick={(e) => {
        e.stopPropagation();
        vote.mutate({ id: idea.id, voted: !idea.voted });
      }}
      className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${
        idea.voted
          ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
          : 'border-line hover:border-orange-300'
      }`}
    >
      👍 {idea.votes}
    </button>
  );
}

function IdeaDialog({ idea, onClose }: { idea: BoardIdea; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const answers: [string, string | null][] = [
    [t('steps.problem.question'), idea.problem],
    [t('steps.audience.question'), idea.audience],
    [t('steps.frequency.question'), idea.frequency && `${t(`frequency.${idea.frequency}.icon`)} ${t(`frequency.${idea.frequency}.label`)}`],
    [t('steps.helps.question'), idea.helps],
    [t('steps.details.question'), idea.details],
  ];
  return (
    <Dialog title={idea.name_idea ?? t('mine.untitled')} onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        {idea.status !== 'new' && <StatusBadge status={idea.status} />}
        <span>{idea.author_name ?? `🙈 ${t('visibility.anonymous.short')}`}</span>
        <span>· {formatDate(idea.created_at, i18n.language)}</span>
        <span className="ml-auto">
          <VoteButton idea={idea} />
        </span>
      </div>
      <dl className="mt-5 space-y-4">
        {answers
          .filter(([, answer]) => answer)
          .map(([question, answer]) => (
            <div key={question}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{question}</dt>
              <dd className="mt-1 whitespace-pre-line">{answer}</dd>
            </div>
          ))}
      </dl>
      <ImageStrip links={idea.image_links} />
    </Dialog>
  );
}
