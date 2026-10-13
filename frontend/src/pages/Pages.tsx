// Shared page building blocks.

export function PageTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {lead && <p className="mt-1.5 text-slate-500 dark:text-slate-400">{lead}</p>}
    </div>
  );
}
