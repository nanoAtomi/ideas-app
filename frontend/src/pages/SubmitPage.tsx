import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { EMPTY_IDEA, useIdeaActions, type IdeaFields } from '../api/ideas';
import { STEPS, StepInput } from '../components/IdeaInputs';
import { imageLinksValid } from '../components/Images';

const DRAFT_KEY = 'ideas.draft';

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

/** The idea wizard: one question per card, a nudge for each, only the first is required. */
export function SubmitPage() {
  const { t } = useTranslation();
  const { submit } = useIdeaActions();
  const [draft, setDraft] = useState<IdeaFields>(loadDraft);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;
  const canContinue = step === 'problem' ? draft.problem.trim() !== '' : step !== 'details' || imageLinksValid(draft.image_links);

  useEffect(() => saveDraft(draft), [draft]);

  const send = () =>
    submit.mutate(draft, {
      onSuccess: () => {
        saveDraft(null);
        setDraft(EMPTY_IDEA);
        setIndex(0);
        setDone(true);
      },
    });

  const next = () => (last ? send() : setIndex(index + 1));

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
      <div className="mb-5 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label={t('wizard.progress', { step: index + 1, total: STEPS.length })}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={index + 1}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-spark-from to-spark-to transition-[width] duration-300"
            style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
          {index + 1}/{STEPS.length}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) next();
        }}
        className="rounded-[28px] border border-line bg-surface p-5 shadow-sm sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
          {step === 'problem' ? t('wizard.required') : t('wizard.optional')}
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">{t(`steps.${step}.question`)}</h1>
        <p className="mt-1.5 mb-5 text-slate-500 dark:text-slate-400">{t(`steps.${step}.hint`)}</p>

        <StepInput key={step} step={step} value={draft} onChange={(update) => setDraft({ ...draft, ...update })} autoFocus />

        <Nudge key={step} step={step} />

        {submit.isError && (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">
            {t('wizard.sendFailed')}
          </p>
        )}

        <div className="mt-7 flex items-center gap-3">
          {index > 0 && (
            <button type="button" onClick={() => setIndex(index - 1)} className="rounded-full px-4 py-3 text-sm font-semibold text-slate-500 hover:text-ink dark:text-slate-400">
              ← {t('wizard.back')}
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {step !== 'problem' && !last && (
              <button type="button" onClick={next} className="rounded-full px-4 py-3 text-sm font-semibold text-slate-500 hover:text-ink dark:text-slate-400">
                {t('wizard.skip')}
              </button>
            )}
            <button
              type="submit"
              disabled={!canContinue || submit.isPending}
              className="rounded-full bg-gradient-to-r from-spark-from to-spark-to px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:brightness-105 disabled:opacity-40 disabled:shadow-none"
            >
              {last ? `💡 ${t('wizard.send')}` : `${t('wizard.next')} →`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/** A rotating thinking prompt under each question - for when the mind goes blank. */
function Nudge({ step }: { step: (typeof STEPS)[number] }) {
  const { t } = useTranslation();
  const prompts = t(`steps.${step}.nudges`, { returnObjects: true }) as string[];
  const [index, setIndex] = useState(() => Math.floor(Math.random() * prompts.length));
  const prompt = prompts[index % prompts.length];
  return (
    <aside className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm dark:bg-amber-500/10">
      <span aria-hidden className="text-xl leading-none">
        💭
      </span>
      <div className="flex-1">
        <p className="font-semibold text-amber-900 dark:text-amber-200">{t('wizard.nudge')}</p>
        <p className="mt-0.5 text-amber-900/80 dark:text-amber-100/80">{prompt}</p>
      </div>
      {prompts.length > 1 && (
        <button
          type="button"
          onClick={() => setIndex(index + 1)}
          className="shrink-0 rounded-full px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-500/20"
        >
          {t('wizard.anotherNudge')} ↻
        </button>
      )}
    </aside>
  );
}
