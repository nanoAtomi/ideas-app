import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ideaFields, useIdea, useIdeaActions, type Idea, type IdeaFields } from '../api/ideas';
import { STEPS, StepInput } from '../components/IdeaInputs';
import { imageLinksValid } from '../components/Images';
import { PageTitle } from './Pages';

/** All wizard questions on one page, for changing an idea later. */
export function EditPage() {
  const { t } = useTranslation();
  const id = Number(useParams().ideaId);
  const idea = useIdea(id);

  if (idea.isPending) return <p className="text-slate-500">{t('loading')}</p>;
  if (idea.isError) {
    return (
      <p className="text-red-700 dark:text-red-400">
        {t('edit.notFound')} <Link to="/mine" className="underline">{t('nav.mine')}</Link>
      </p>
    );
  }
  return <EditForm idea={idea.data} />;
}

function EditForm({ idea }: { idea: Idea }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { edit } = useIdeaActions();
  const [fields, setFields] = useState<IdeaFields>(() => ideaFields(idea));
  const valid = fields.problem.trim() !== '' && imageLinksValid(fields.image_links);

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t('edit.title')} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) edit.mutate({ ...fields, id: idea.id }, { onSuccess: () => navigate('/mine') });
        }}
        className="space-y-7 rounded-[28px] border border-line bg-surface p-5 shadow-sm sm:p-8"
      >
        {STEPS.map((step) => (
          <section key={step}>
            <h2 className="mb-2.5 font-semibold">{t(`steps.${step}.question`)}</h2>
            <StepInput step={step} value={fields} onChange={(update) => setFields({ ...fields, ...update })} />
          </section>
        ))}
        {edit.isError && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {t('wizard.sendFailed')}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Link to="/mine" className="rounded-full px-4 py-3 text-sm font-semibold hover:bg-ink/5 dark:hover:bg-white/10">
            {t('common.cancel')}
          </Link>
          <button
            type="submit"
            disabled={!valid || edit.isPending}
            className="rounded-full bg-gradient-to-r from-spark-from to-spark-to px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/25 disabled:opacity-40"
          >
            {t('edit.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
