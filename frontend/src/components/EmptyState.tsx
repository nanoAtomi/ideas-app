import type { ReactNode } from 'react';

interface Props {
  icon: string;
  title: string;
  text?: string;
  children?: ReactNode;
}

/** Friendly placeholder card for empty views. */
export function EmptyState({ icon, title, text, children }: Props) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <div aria-hidden className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-amber-100 text-3xl dark:bg-amber-500/15">
        {icon}
      </div>
      <p className="text-lg font-semibold">{title}</p>
      {text && <p className="mx-auto mt-1.5 max-w-md text-slate-500 dark:text-slate-400">{text}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
