import { useTranslation } from 'react-i18next';
import { LANGUAGES, type Language } from '../i18n';

interface Props {
  onChange: (language: Language) => void;
}

/** DE | EN toggle that shows the current language as pressed. */
export function LanguageSwitch({ onChange }: Props) {
  const { t, i18n } = useTranslation();
  return (
    <div role="group" aria-label={t('header.language')} className="flex rounded-full border border-line p-0.5 text-xs font-semibold">
      {LANGUAGES.map((language) => {
        const active = i18n.resolvedLanguage === language;
        return (
          <button
            key={language}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(language)}
            className={`min-w-9 rounded-full px-2 py-1 uppercase transition-colors ${
              active ? 'bg-ink text-canvas' : 'text-slate-500 hover:text-ink dark:text-slate-400'
            }`}
          >
            {language}
          </button>
        );
      })}
    </div>
  );
}
