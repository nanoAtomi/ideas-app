import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { EMPTY_IDEA, useIdeaActions, type IdeaFields } from '../api/ideas';
import { STEPS, StepInput, type Step } from '../components/IdeaInputs';
import { ImageStrip, imageLinksValid, previewUrl } from '../components/Images';

const DRAFT_KEY = 'ideas.draft';
/** Index of the summary after the last question. */
const REVIEW = STEPS.length;

// Half-typed answers survive a reload or an accidental tap on another tab.
function loadDraft(): IdeaFields {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    return saved ? { ...EMPTY_IDEA, ...JSON.parse(saved) } : EMPTY_IDEA;
  } catch {
    return EMPTY_IDEA;
  }
}

function saveDraft(draft: IdeaFields | null) {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage blocked (private mode): the draft just isn't kept.
  }
}

/**
 * The idea wizard: one question at a time, then a summary of every answer where each
 * can be changed before sending. Only the problem is required.
 */
export function SubmitPage() {
  const { t } = useTranslation();
  const { submit } = useIdeaActions();
  const [draft, setDraft] = useState<IdeaFields>(loadDraft);
  const [index, setIndex] = useState(0);
  // Furthest step reached - the step dots let people jump back to any of them.
  const [furthest, setFurthest] = useState(0);
  // Opened from the summary: "next" leads back there instead of to the following question.
  const [fromReview, setFromReview] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => saveDraft(draft), [draft]);

  const goTo = (target: number) => {
    setIndex(target);
    setFurthest((f) => Math.max(f, target));
    window.scrollTo?.({ top: 0 });
  };

  const send = () =>
    submit.mutate(draft, {
      onSuccess: () => {
        saveDraft(null);
        setDraft(EMPTY_IDEA);
        setIndex(0);
        setFurthest(0);
        setFromReview(false);
        setDone(true);
      },
    });

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-[28px] border border-line bg-surface px-6 py-12 text-center shadow-sm">
        <div aria-hidden className="mx-auto mb-5 grid size-20 animate-[bounce_1s_ease-out_1] place-items-center rounded-3xl bg-gradient-to-br from-spark-from to-spark-to text-4xl shadow-lg shadow-orange-500/30">
          💡
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t('wizard.thanksTitle')}</h1>
        <p className="mx-auto mt-2 max-w-sm text-slate-500 dark:text-slate-400">{t('wizard.thanksText')}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={() => setDone(false)} className="rounded-full bg-gradient-to-r from-spark-from to-spark-to px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/25">
            {t('wizard.another')}
          </button>
          <Link to="/mine" className="rounded-full border border-line px-5 py-3 text-sm font-semibold hover:bg-ink/5 dark:hover:bg-white/10">
            {t('nav.mine')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <StepNav
        index={index}
        furthest={furthest}
        onGo={(i) => {
          // Once the summary was reached, a jump back returns there after the change.
          setFromReview(i !== REVIEW && furthest >= REVIEW);
          goTo(i);
        }}
      />
      {index === REVIEW ? (
        <Review
          draft={draft}
          sending={submit.isPending}
          failed={submit.isError}
          onEdit={(i) => {
            setFromReview(true);
            goTo(i);
          }}
          onSend={send}
        />
      ) : (
        // Keyed by step: each question is a fresh card - nothing of the last one stays.
        <Question
          key={STEPS[index]}
          step={STEPS[index]}
          draft={draft}
          onChange={(update) => setDraft({ ...draft, ...update })}
          onBack={index > 0 ? () => goTo(index - 1) : undefined}
          onNext={() => goTo(fromReview ? REVIEW : index + 1)}
          fromReview={fromReview}
        />
      )}
    </div>
  );
}

/** Progress bar plus one dot per step; reached steps can be jumped to. */
function StepNav({ index, furthest, onGo }: { index: number; furthest: number; onGo: (i: number) => void }) {
  const { t } = useTranslation();
  const total = STEPS.length + 1;
  return (
    <nav aria-label={t('wizard.stepNav')} className="mb-4">
      <div className="flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label={t('wizard.progress', { step: index + 1, total })}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-spark-from to-spark-to transition-[width] duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
          {index + 1}/{total}
        </span>
      </div>
      <ol className="mt-3 flex justify-between gap-1">
        {[...STEPS, 'review' as const].map((step, i) => {
          const reachable = i <= furthest;
          const current = i === index;
          return (
            <li key={step}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onGo(i)}
                aria-current={current ? 'step' : undefined}
                aria-label={t('wizard.goTo', { n: i + 1, question: t(step === 'review' ? 'wizard.reviewStep' : `steps.${step}.short`) })}
                className={`grid size-9 place-items-center rounded-full text-xs font-bold transition sm:size-10 ${
                  current
                    ? 'bg-gradient-to-br from-spark-from to-spark-to text-white shadow-md shadow-orange-500/30'
                    : reachable
                      ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300'
                      : 'bg-ink/5 text-slate-400 dark:bg-white/5'
                }`}
              >
                {step === 'review' ? '✓' : i + 1}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface QuestionProps {
  step: Step;
  draft: IdeaFields;
  onChange: (update: Partial<IdeaFields>) => void;
  onBack?: () => void;
  onNext: () => void;
  fromReview: boolean;
}

/** One question: the question right above its field, a small hint, an optional nudge. */
function Question({ step, draft, onChange, onBack, onNext, fromReview }: QuestionProps) {
  const { t } = useTranslation();
  const required = step === 'problem';
  const canContinue = required ? draft.problem.trim() !== '' : step !== 'details' || imageLinksValid(draft.image_links);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canContinue) onNext();
      }}
      className="rounded-[28px] border border-line bg-surface p-5 shadow-sm sm:p-8"
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t(`steps.${step}.question`)}</h1>
        {!required && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">{t('wizard.optionalBadge')}</span>}
      </div>

      <StepInput step={step} value={draft} onChange={onChange} autoFocus />

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t(`steps.${step}.hint`)}</p>
      <Nudge step={step} />

      {/* Phones: the buttons stay in thumb reach above the bottom navigation. */}
      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] -mx-5 mt-6 flex items-center gap-2 border-t border-line bg-surface/95 px-5 pt-4 pb-1 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        {onBack && !fromReview && (
          <button type="button" onClick={onBack} className="min-h-11 rounded-full px-3 text-sm font-semibold text-slate-500 hover:text-ink dark:text-slate-400">
            ← {t('wizard.back')}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!required && !fromReview && (
            <button type="button" onClick={onNext} className="min-h-11 rounded-full px-3 text-sm font-semibold text-slate-500 hover:text-ink dark:text-slate-400">
              {t('wizard.skip')}
            </button>
          )}
          <button
            type="submit"
            disabled={!canContinue}
            className="min-h-11 rounded-full bg-gradient-to-r from-spark-from to-spark-to px-6 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:brightness-105 disabled:opacity-40 disabled:shadow-none"
          >
            {fromReview ? `✓ ${t('wizard.backToReview')}` : `${t('wizard.next')} →`}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Every question and answer at a glance; each can be changed, then the idea goes out. */
function Review({ draft, sending, failed, onEdit, onSend }: { draft: IdeaFields; sending: boolean; failed: boolean; onEdit: (i: number) => void; onSend: () => void }) {
  const { t } = useTranslation();
  const answer = (step: Step): string | null => {
    switch (step) {
      case 'concerns':
        return draft.concerns ? `🧩 ${draft.concerns}` : `✨ ${t('concerns.new')}`;
      case 'problem':
        return draft.problem.trim() || null;
      case 'audience':
        return draft.audience;
      case 'frequency':
        return draft.frequency && `${t(`frequency.${draft.frequency}.icon`)} ${t(`frequency.${draft.frequency}.label`)}`;
      case 'helps':
        return draft.helps;
      case 'name':
        return draft.name_idea;
      case 'details':
        return draft.details;
      case 'visibility':
        return `${t(`visibility.${draft.visibility}.icon`)} ${t(`visibility.${draft.visibility}.label`)}${
          draft.visibility === 'board' && draft.anonymous ? ` · 🙈 ${t('visibility.anonymous.short')}` : ''
        }`;
    }
  };
  const images = draft.image_links.map((link) => previewUrl(link)).filter((url): url is string => url !== null);

  return (
    <section className="rounded-[28px] border border-line bg-surface p-5 shadow-sm sm:p-8">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('wizard.reviewTitle')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('wizard.reviewLead')}</p>

      <dl className="mt-5 divide-y divide-line">
        {STEPS.map((step, i) => {
          const value = answer(step);
          return (
            <div key={step} className="flex items-start gap-3 py-3.5">
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t(`steps.${step}.question`)}</dt>
                <dd className={`mt-1 whitespace-pre-line break-words ${value ? '' : 'italic text-slate-400'}`}>{value ?? t('wizard.skipped')}</dd>
                {step === 'details' && <ImageStrip links={images} size="sm" />}
              </div>
              <button
                type="button"
                onClick={() => onEdit(i)}
                aria-label={t('wizard.editAnswer', { question: t(`steps.${step}.question`) })}
                className="min-h-11 shrink-0 rounded-full border border-line px-3.5 text-sm font-semibold hover:bg-ink/5 dark:hover:bg-white/10"
              >
                ✏️ <span className="hidden sm:inline">{t('wizard.edit')}</span>
              </button>
            </div>
          );
        })}
      </dl>

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        📜 {t('rules.beforeSend')}{' '}
        <Link to="/rules" className="font-semibold text-orange-700 hover:underline dark:text-orange-300">
          {t('rules.link')}
        </Link>
      </p>
      {failed && (
        <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">
          {t('wizard.sendFailed')}
        </p>
      )}
      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] -mx-5 mt-4 border-t border-line bg-surface/95 px-5 pt-4 pb-1 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          type="button"
          onClick={onSend}
          disabled={sending || draft.problem.trim() === ''}
          className="min-h-12 w-full rounded-full bg-gradient-to-r from-spark-from to-spark-to px-6 text-base font-semibold text-white shadow-md shadow-orange-500/25 transition hover:brightness-105 disabled:opacity-40 sm:w-auto sm:float-right"
        >
          💡 {t('wizard.send')}
        </button>
      </div>
    </section>
  );
}

/** A rotating thinking prompt, folded away until someone asks for it. */
function Nudge({ step }: { step: Step }) {
  const { t } = useTranslation();
  const prompts = t(`steps.${step}.nudges`, { returnObjects: true }) as string[];
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * prompts.length));
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm font-semibold text-orange-700 hover:underline dark:text-orange-300">
        💭 {t('wizard.nudgeToggle')}
      </button>
    );
  }
  return (
    <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
      <span aria-hidden>💭</span>
      <span className="flex-1">{prompts[index % prompts.length]}</span>
      {prompts.length > 1 && (
        <button type="button" onClick={() => setIndex(index + 1)} className="shrink-0 font-semibold text-amber-800 hover:underline dark:text-amber-200">
          {t('wizard.anotherNudge')} ↻
        </button>
      )}
    </p>
  );
}
