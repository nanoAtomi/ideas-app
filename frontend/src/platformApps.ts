/**
 * Another platform app's address: apps live at <slug>.<domain>, next to this one
 * (ideas.nicasso.de -> todo.nicasso.de). Null locally, where there are no neighbours.
 */
export function siblingAppUrl(slug: string, location: Pick<Location, 'protocol' | 'hostname'> = window.location): string | null {
  const parts = location.hostname.split('.');
  if (parts.length < 3) return null;
  return `${location.protocol}//${[slug, ...parts.slice(1)].join('.')}`;
}

/** A link that opens Todo with this task prefilled; Todo creates it only once confirmed. */
export function todoTaskUrl(title: string, notes: string): string | null {
  const todo = siblingAppUrl('todo');
  return todo && `${todo}/?${new URLSearchParams({ add: title, notes })}`;
}
