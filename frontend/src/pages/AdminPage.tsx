import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { STATUSES, useAdminActions, useAdminIdeas, type AdminIdea, type Status } from '../api/ideas';
import { Dialog } from '../components/Dialog';
import { EmptyState } from '../components/EmptyState';
import { Switch } from '../components/Switch';
import { ImageStrip } from '../components/Images';
import { STEPS } from '../components/IdeaInputs';
import { formatDate, STATUS_STYLE } from '../components/StatusBadge';
import { PageTitle } from './Pages';

/** Kanban over all ideas: drag a card into another column to change its status. */
export function AdminPage({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  if (!isAdmin) {
    return (
      <>
        <PageTitle title={t('admin.title')} />
        <EmptyState icon="🔒" title={t('admin.forbidden')} />
      </>
    );
  }
  return <AdminBoard />;
}

function AdminBoard() {
  const { t } = useTranslation();
  const ideas = useAdminIdeas();
  const [showDeleted, setShowDeleted] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const visible = (ideas.data ?? []).filter((idea) => showDeleted || !idea.deleted_at);
  const open = ideas.data?.find((idea) => idea.id === openId) ?? null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle title={t('admin.title')} lead={t('admin.lead', { count: ideas.data?.length ?? 0 })} />
        <div className="mb-6 flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          {t('admin.showDeleted')}
          <Switch checked={showDeleted} onChange={setShowDeleted} label={t('admin.showDeleted')} />
        </div>
      </div>
      {ideas.isPending && <p className="text-slate-500">{t('loading')}</p>}
      {ideas.isError && <p className="text-red-700 dark:text-red-400">{t('error.load', { message: ideas.error.message })}</p>}
      {ideas.data && <Board ideas={visible} onOpen={(idea) => setOpenId(idea.id)} />}
      {open && <IdeaDetail idea={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function columnIdeas(ideas: AdminIdea[], status: Status): AdminIdea[] {
  return ideas.filter((idea) => idea.status === status).sort((a, b) => a.position - b.position || b.id - a.id);
}

function Board({ ideas, onOpen }: { ideas: AdminIdea[]; onOpen: (idea: AdminIdea) => void }) {
  const { update } = useAdminActions();
  const [active, setActive] = useState<AdminIdea | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const columns = Object.fromEntries(STATUSES.map((status) => [status, columnIdeas(ideas, status)])) as Record<Status, AdminIdea[]>;

  const onDragStart = ({ active: a }: DragStartEvent) => setActive(ideas.find((idea) => idea.id === a.id) ?? null);

  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    setActive(null);
    const idea = ideas.find((i) => i.id === a.id);
    if (!idea || !over) return;
    const status = (over.data.current?.status as Status | undefined) ?? idea.status;
    const target = columns[status].filter((i) => i.id !== idea.id);
    // Dropped on a card: take its place; dropped on the column background: go last.
    const overIndex = target.findIndex((i) => i.id === over.id);
    const index = overIndex === -1 ? target.length : overIndex;
    const before = target[index - 1]?.position;
    const after = target[index]?.position;
    const position =
      before === undefined && after === undefined ? idea.position : before === undefined ? after! - 1 : after === undefined ? before + 1 : (before + after) / 2;
    if (status === idea.status && position === idea.position) return;
    update.mutate({ id: idea.id, status, position });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 lg:mx-0 lg:snap-none lg:px-0">
        {STATUSES.map((status) => (
          <Column key={status} status={status} ideas={columns[status]} onOpen={onOpen} />
        ))}
      </div>
      <DragOverlay>{active && <Card idea={active} dragging />}</DragOverlay>
    </DndContext>
  );
}

function Column({ status, ideas, onOpen }: { status: Status; ideas: AdminIdea[]; onOpen: (idea: AdminIdea) => void }) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { status } });
  return (
    <section
      ref={setNodeRef}
      aria-label={t(`status.${status}`)}
      className={`flex w-[80vw] shrink-0 snap-center flex-col rounded-3xl bg-ink/[0.04] p-2.5 sm:w-72 lg:w-auto lg:min-w-52 lg:flex-1 dark:bg-white/[0.04] ${
        isOver ? 'ring-2 ring-orange-400' : ''
      }`}
    >
      <h2 className="mb-2.5 flex items-center gap-2 px-1.5 pt-1 text-sm font-semibold">
        <span aria-hidden className={`size-2 rounded-full ${STATUS_STYLE[status].dot}`} />
        {t(`status.${status}`)}
        <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-xs font-normal text-slate-500">{ideas.length}</span>
      </h2>
      <SortableContext items={ideas.map((idea) => idea.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-24 flex-col gap-2">
          {ideas.map((idea) => (
            <SortableCard key={idea.id} idea={idea} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableCard({ idea, onOpen }: { idea: AdminIdea; onOpen: (idea: AdminIdea) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: idea.id, data: { status: idea.status } });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? 'opacity-30' : ''} {...attributes} {...listeners}>
      <Card idea={idea} onOpen={onOpen} />
    </div>
  );
}

function Card({ idea, onOpen, dragging = false }: { idea: AdminIdea; onOpen?: (idea: AdminIdea) => void; dragging?: boolean }) {
  const { t, i18n } = useTranslation();
  return (
    <div
      onClick={() => onOpen?.(idea)}
      className={`cursor-pointer rounded-2xl border border-line bg-surface p-3.5 text-sm shadow-sm transition ${
        dragging ? 'rotate-2 shadow-xl' : 'hover:border-orange-300 hover:shadow-md'
      } ${idea.deleted_at ? 'opacity-60' : ''}`}
    >
      <p className="font-semibold leading-snug">{idea.name_idea ?? t('mine.untitled')}</p>
      <p className="mt-1 line-clamp-2 text-slate-600 dark:text-slate-300">{idea.problem}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">{idea.author.display_name}</span>
        <span>· {formatDate(idea.created_at, i18n.language)}</span>
        <span className="ml-auto flex gap-1">
          {idea.visibility === 'private' && <span title={t('visibility.private.short')}>🔒</span>}
          {idea.visibility === 'board' && idea.anonymous && <span title={t('visibility.anonymous.short')}>🙈</span>}
          {idea.hidden && <span title={t('admin.hiddenBadge')}>🙊</span>}
          {idea.admin_reply && <span title={t('admin.repliedBadge')}>💬</span>}
          {idea.deleted_at && <span title={t('admin.deletedBadge')}>🗑️</span>}
        </span>
      </div>
    </div>
  );
}

function IdeaDetail({ idea, onClose }: { idea: AdminIdea; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { update, purge } = useAdminActions();
  const [reply, setReply] = useState(idea.admin_reply ?? '');
  const [confirmPurge, setConfirmPurge] = useState(false);

  const answers: [string, string | null][] = STEPS.filter((step) => step !== 'visibility').map((step) => [
    t(`steps.${step}.question`),
    step === 'frequency'
      ? idea.frequency && `${t(`frequency.${idea.frequency}.icon`)} ${t(`frequency.${idea.frequency}.label`)}`
      : idea[({ problem: 'problem', audience: 'audience', helps: 'helps', name: 'name_idea', details: 'details' } as const)[step]],
  ]);

  return (
    <Dialog title={idea.name_idea ?? t('mine.untitled')} onClose={onClose} wide>
      <div className="flex flex-wrap gap-2 text-xs">
        {idea.deleted_at && (
          <span className="rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-800 dark:bg-red-500/15 dark:text-red-300">
            🗑️ {t('admin.deletedOn', { date: formatDate(idea.deleted_at, i18n.language) })}
          </span>
        )}
        <span className="rounded-full bg-ink/5 px-2.5 py-1 dark:bg-white/10">
          {t(`visibility.${idea.visibility}.icon`)} {t(`visibility.${idea.visibility}.short`)}
          {idea.visibility === 'board' && idea.anonymous && ` · 🙈 ${t('visibility.anonymous.short')}`}
        </span>
        <span className="rounded-full bg-ink/5 px-2.5 py-1 dark:bg-white/10">
          👤 {idea.author.display_name}
          {idea.author.email && ` · ${idea.author.email}`}
        </span>
      </div>

      <dl className="mt-5 space-y-4">
        {answers.map(([question, answer]) => (
          <div key={question}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{question}</dt>
            <dd className={`mt-1 whitespace-pre-line ${answer ? '' : 'text-slate-400 italic'}`}>{answer || t('admin.skipped')}</dd>
          </div>
        ))}
      </dl>
      <ImageStrip links={idea.image_links} />

      <div className="mt-6 grid gap-4 rounded-3xl bg-ink/[0.03] p-4 sm:grid-cols-2 dark:bg-white/[0.04]">
        <label className="text-sm font-semibold">
          {t('admin.status')}
          <select
            value={idea.status}
            onChange={(e) => update.mutate({ id: idea.id, status: e.target.value as Status })}
            className="mt-1.5 block w-full rounded-xl border border-line bg-surface px-3 py-2.5 font-normal"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_STYLE[status].icon} {t(`status.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between gap-3 self-end rounded-xl px-1 py-2.5 text-sm">
          <span>
            <span className="font-semibold">🙊 {t('admin.hide')}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{t('admin.hideHint')}</span>
          </span>
          <Switch checked={idea.hidden} onChange={(hidden) => update.mutate({ id: idea.id, hidden })} label={t('admin.hide')} />
        </div>
        <form
          className="sm:col-span-2"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate({ id: idea.id, admin_reply: reply });
          }}
        >
          <label className="text-sm font-semibold" htmlFor="admin-reply">
            💬 {t('admin.reply')}
          </label>
          <textarea
            id="admin-reply"
            rows={3}
            maxLength={5000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t('admin.replyPlaceholder')}
            className="mt-1.5 w-full rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20"
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            {idea.replied_at && reply === (idea.admin_reply ?? '') && (
              <span className="text-xs text-slate-500">{t('admin.repliedOn', { date: formatDate(idea.replied_at, i18n.language) })}</span>
            )}
            <button
              type="submit"
              disabled={reply === (idea.admin_reply ?? '') || update.isPending}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-canvas disabled:opacity-40"
            >
              {t('admin.sendReply')}
            </button>
          </div>
        </form>
      </div>
      {update.isError && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{t('error.load', { message: update.error.message })}</p>}

      <div className="mt-6 border-t border-line pt-4">
        {confirmPurge ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm dark:bg-red-500/10">
            <p className="text-red-800 dark:text-red-300">{t('admin.purgeText')}</p>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setConfirmPurge(false)} className="rounded-full px-4 py-2 font-semibold hover:bg-ink/5 dark:hover:bg-white/10">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => purge.mutate(idea.id, { onSuccess: onClose })}
                disabled={purge.isPending}
                className="rounded-full bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t('admin.purgeConfirm')}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmPurge(true)} className="text-sm font-semibold text-red-700 hover:underline dark:text-red-400">
            {t('admin.purge')}
          </button>
        )}
      </div>
    </Dialog>
  );
}
