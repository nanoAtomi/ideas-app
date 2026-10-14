import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FREQUENCIES, useConcerns, type Frequency, type IdeaFields, type Visibility } from '../api/ideas';
import { ImageLinksInput } from './Images';
import { Switch } from './Switch';

// One input per wizard question. The wizard shows them one at a time; the edit page
// shows all of them on one page.

export const STEPS = ['concerns', 'problem', 'audience', 'frequency', 'helps', 'name', 'details', 'visibility'] as const;
export type Step = (typeof STEPS)[number];

export const LIMITS = { problem: 2000, audience: 300, helps: 2000, name_idea: 120, details: 10000, concerns: 60 };

const field =
  'w-full rounded-2xl border border-line bg-canvas px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20';

interface InputProps {
  value: IdeaFields;
  onChange: (update: Partial<IdeaFields>) => void;
  autoFocus?: boolean;
}

/** Empty text counts as "skipped". */
const orNull = (text: string) => (text === '' ? null : text);

export function StepInput({ step, value, onChange, autoFocus }: InputProps & { step: Step }) {
  const { t } = useTranslation();
  const label = t(`steps.${step}.question`);
  switch (step) {
    case 'concerns':
      return <ConcernsInput value={value} onChange={onChange} autoFocus={autoFocus} />;
    case 'problem':
      return (
        <textarea
          aria-label={label}
          autoFocus={autoFocus}
          rows={4}
          maxLength={LIMITS.problem}
          value={value.problem}
          onChange={(e) => onChange({ problem: e.target.value })}
          placeholder={t('steps.problem.placeholder')}
          className={field}
        />
      );
    case 'audience':
      return (
        <div>
          <input
            aria-label={label}
            autoFocus={autoFocus}
            maxLength={LIMITS.audience}
            value={value.audience ?? ''}
            onChange={(e) => onChange({ audience: orNull(e.target.value) })}
            placeholder={t('steps.audience.placeholder')}
            className={field}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {(t('steps.audience.chips', { returnObjects: true }) as string[]).map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onChange({ audience: chip })}
                aria-pressed={value.audience === chip}
                className={`rounded-full border px-3.5 py-2 text-sm transition ${
                  value.audience === chip ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' : 'border-line hover:border-orange-300'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      );
    case 'frequency':
      return (
        <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
          {FREQUENCIES.map((frequency) => (
            <ChoiceCard
              key={frequency}
              checked={value.frequency === frequency}
              onSelect={() => onChange({ frequency: value.frequency === frequency ? null : (frequency as Frequency) })}
              icon={t(`frequency.${frequency}.icon`)}
              title={t(`frequency.${frequency}.label`)}
            />
          ))}
        </div>
      );
    case 'helps':
      return (
        <textarea
          aria-label={label}
          autoFocus={autoFocus}
          rows={4}
          maxLength={LIMITS.helps}
          value={value.helps ?? ''}
          onChange={(e) => onChange({ helps: orNull(e.target.value) })}
          placeholder={t('steps.helps.placeholder')}
          className={field}
        />
      );
    case 'name':
      return (
        <input
          aria-label={label}
          autoFocus={autoFocus}
          maxLength={LIMITS.name_idea}
          value={value.name_idea ?? ''}
          onChange={(e) => onChange({ name_idea: orNull(e.target.value) })}
          placeholder={t('steps.name.placeholder')}
          className={`${field} text-lg font-semibold`}
        />
      );
    case 'details':
      return (
        <>
          <textarea
            aria-label={label}
            autoFocus={autoFocus}
            rows={7}
            maxLength={LIMITS.details}
            value={value.details ?? ''}
            onChange={(e) => onChange({ details: orNull(e.target.value) })}
            placeholder={t('steps.details.placeholder')}
            className={field}
          />
          <ImageLinksInput links={value.image_links} onChange={(image_links) => onChange({ image_links })} />
        </>
      );
    case 'visibility':
      return <VisibilityInput value={value} onChange={onChange} />;
  }
}

/** A new app, or an existing one - by name, with the names others already used as chips. */
function ConcernsInput({ value, onChange, autoFocus }: InputProps) {
  const { t } = useTranslation();
  const known = useConcerns().data ?? [];
  // "Existing app" stays chosen while the name is still empty.
  const [existing, setExisting] = useState(value.concerns !== null);
  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-2 text-sm transition ${
      active ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' : 'border-line hover:border-orange-300'
    }`;
  return (
    <div>
      <div role="radiogroup" aria-label={t('steps.concerns.question')} className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          checked={!existing}
          onSelect={() => {
            setExisting(false);
            onChange({ concerns: null });
          }}
          icon="✨"
          title={t('concerns.new')}
          text={t('concerns.newText')}
        />
        <ChoiceCard checked={existing} onSelect={() => setExisting(true)} icon="🧩" title={t('concerns.existing')} text={t('concerns.existingText')} />
      </div>
      {existing && (
        <div className="mt-4">
          <input
            aria-label={t('concerns.appName')}
            autoFocus={autoFocus}
            maxLength={LIMITS.concerns}
            value={value.concerns ?? ''}
            onChange={(e) => onChange({ concerns: orNull(e.target.value) })}
            placeholder={t('concerns.placeholder')}
            className={field}
          />
          {known.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {known.map((name) => (
                <button key={name} type="button" onClick={() => onChange({ concerns: name })} aria-pressed={value.concerns === name} className={chip(value.concerns === name)}>
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VisibilityInput({ value, onChange }: InputProps) {
  const { t } = useTranslation();
  const options: Visibility[] = ['board', 'private'];
  return (
    <div>
      <div role="radiogroup" aria-label={t('steps.visibility.question')} className="grid gap-3 sm:grid-cols-2">
        {options.map((visibility) => (
          <ChoiceCard
            key={visibility}
            checked={value.visibility === visibility}
            onSelect={() => onChange({ visibility })}
            icon={t(`visibility.${visibility}.icon`)}
            title={t(`visibility.${visibility}.label`)}
            text={t(`visibility.${visibility}.text`)}
          />
        ))}
      </div>
      {value.visibility === 'board' && (
        <div className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-line p-4">
          <span>
            <span className="font-semibold">🙈 {t('visibility.anonymous.label')}</span>
            <span className="block text-sm text-slate-500 dark:text-slate-400">{t('visibility.anonymous.text')}</span>
          </span>
          <Switch checked={value.anonymous} onChange={(anonymous) => onChange({ anonymous })} label={t('visibility.anonymous.label')} />
        </div>
      )}
    </div>
  );
}

function ChoiceCard({ checked, onSelect, icon, title, text }: { checked: boolean; onSelect: () => void; icon: string; title: string; text?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
        checked ? 'border-orange-400 bg-orange-50 shadow-md shadow-orange-500/10 dark:bg-orange-500/10' : 'border-line hover:border-orange-200 dark:hover:border-orange-500/40'
      }`}
    >
      <span aria-hidden className="text-2xl leading-none">
        {icon}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        {text && <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{text}</span>}
      </span>
    </button>
  );
}
