import { useTranslation } from 'react-i18next';
import { IMGUR_LINK, MAX_IMAGES } from '../api/ideas';

/**
 * Preview URL for a link the user typed: the server stores i.imgur.com/<id>.<ext>; for
 * a page link (imgur.com/<id>) the same image is reachable as .jpg.
 */
export function previewUrl(link: string): string | null {
  const trimmed = link.trim();
  if (!IMGUR_LINK.test(trimmed)) return null;
  const url = new URL(trimmed);
  const [id, ext] = url.pathname.replace(/^\/|\/$/g, '').split('.');
  return `https://i.imgur.com/${id}.${ext ? ext.replace('jpeg', 'jpg') : 'jpg'}`;
}

/** Every non-empty link is one the server will accept. */
export function imageLinksValid(links: string[]): boolean {
  return links.every((link) => link.trim() === '' || previewUrl(link) !== null);
}

/** Up to three imgur links, each with a live preview or a hint what's wrong. */
export function ImageLinksInput({ links, onChange }: { links: string[]; onChange: (links: string[]) => void }) {
  const { t } = useTranslation();
  const slots = [...links, ...Array(MAX_IMAGES).fill('')].slice(0, MAX_IMAGES);
  // Empty slots stay in place (so typing in the 2nd field doesn't jump); the server drops them.
  const set = (index: number, value: string) => onChange(slots.map((link, i) => (i === index ? value : link)));

  return (
    <div className="mt-5">
      <p className="text-sm font-semibold">🖼️ {t('images.title')}</p>
      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('images.hint')}</p>
      <div className="mt-3 space-y-2.5">
        {slots.map((link, index) => {
          const preview = link.trim() ? previewUrl(link) : null;
          const invalid = link.trim() !== '' && !preview;
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-canvas text-lg">
                {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <span aria-hidden>📷</span>}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="url"
                  inputMode="url"
                  value={link}
                  onChange={(e) => set(index, e.target.value)}
                  placeholder="https://imgur.com/…"
                  aria-label={t('images.label', { n: index + 1 })}
                  aria-invalid={invalid}
                  className={`w-full rounded-xl border bg-canvas px-3 py-2.5 outline-none focus:ring-4 ${
                    invalid ? 'border-red-400 focus:ring-red-400/20' : 'border-line focus:border-orange-400 focus:ring-orange-400/20'
                  }`}
                />
                {invalid && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{t('images.invalid')}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Thumbnails that open the full image on imgur. */
export function ImageStrip({ links, size = 'md' }: { links: string[]; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  if (links.length === 0) return null;
  const box = size === 'sm' ? 'size-14' : 'size-24 sm:size-28';
  return (
    <div className="mt-3 flex gap-2">
      {links.map((link, index) => (
        <a
          key={link}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`${box} overflow-hidden rounded-xl border border-line bg-canvas transition hover:brightness-95`}
        >
          <img src={link} alt={t('images.alt', { n: index + 1 })} loading="lazy" className="size-full object-cover" />
        </a>
      ))}
    </div>
  );
}
