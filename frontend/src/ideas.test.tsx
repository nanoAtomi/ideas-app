import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminIdea, Idea } from './api/ideas';
import type { Me } from './api/me';
import { App } from './App';
import i18n from './i18n';

const me: Me = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  display_name: 'alice',
  language: null,
  is_admin: true,
  portal_url: null,
  logout_url: null,
  feedback_url: null,
};

const idea: Idea = {
  id: 7,
  problem: 'I forget whose turn the dishes are',
  audience: 'Flatmates',
  frequency: 'daily',
  helps: null,
  name_idea: '🍽️ Dishduty',
  details: null,
  visibility: 'board',
  anonymous: true,
  status: 'planned',
  admin_reply: 'Love it, building it next!',
  replied_at: '2026-10-12T10:00:00Z',
  created_at: '2026-10-10T10:00:00Z',
  updated_at: '2026-10-10T10:00:00Z',
};

const adminIdeas: AdminIdea[] = [
  { ...idea, author: { id: 1, username: 'alice', display_name: 'alice', email: 'alice@example.com' }, position: 0, hidden: false, deleted_at: null },
  {
    ...idea,
    id: 8,
    name_idea: null,
    problem: 'Too shy to keep this',
    status: 'new',
    visibility: 'private',
    admin_reply: null,
    author: { id: 2, username: 'bob', display_name: 'bob', email: null },
    position: -1,
    hidden: false,
    deleted_at: '2026-10-11T10:00:00Z',
  },
];

let fetchMock: ReturnType<typeof vi.fn>;

function renderApp(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const json = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status });

describe('ideas', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    sessionStorage.clear();
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/me') return json(me);
      if (url === '/api/ideas' && method === 'POST') return json({ ...idea, ...JSON.parse(String(init!.body)), id: 9, status: 'new' }, 201);
      if (url === '/api/ideas/mine') return json([idea]);
      if (url === '/api/ideas/7' && method === 'DELETE') return json(null, 204);
      if (url === '/api/admin/ideas') return json(adminIdeas);
      return json({ detail: 'Not found' }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('walks through the wizard: only the problem is required', async () => {
    const user = userEvent.setup();
    renderApp('/submit');
    expect(await screen.findByRole('heading', { name: 'What problem bugs you?' })).toBeInTheDocument();
    expect(screen.getByText('Nudge')).toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'Next →' });
    expect(next).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: 'What problem bugs you?' }), 'Plants keep dying');
    await user.click(next);
    expect(screen.getByRole('heading', { name: 'Who has this problem?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Flatmates' }));
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    await user.click(screen.getByRole('radio', { name: /Every week/ }));
    // Skip the rest up to visibility.
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByRole('textbox', { name: 'Tell us whatever you like' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByRole('heading', { name: 'Who may see your idea?' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Show anonymously/ }));
    await user.click(screen.getByRole('button', { name: '💡 Send idea' }));

    expect(await screen.findByRole('heading', { name: 'Thanks! Your idea has arrived.' })).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([url, init]) => url === '/api/ideas' && init?.method === 'POST')!;
    expect(JSON.parse(post[1].body)).toEqual({
      problem: 'Plants keep dying',
      audience: 'Flatmates',
      frequency: 'weekly',
      helps: null,
      name_idea: null,
      details: null,
      visibility: 'board',
      anonymous: true,
    });
  });

  it('lists my ideas with status and reply, and deletes honestly', async () => {
    const user = userEvent.setup();
    renderApp('/mine');
    expect(await screen.findByRole('heading', { name: '🍽️ Dishduty' })).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('Love it, building it next!')).toBeInTheDocument();
    expect(screen.getByText(/Anonymous/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Edit/ })).toHaveAttribute('href', '/mine/7/edit');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete idea?' });
    expect(within(dialog).getByText(/Nico can still see it/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Yes, delete' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/ideas/7', expect.objectContaining({ method: 'DELETE' }));
  });

  it('shows every idea on the admin board, deleted ones marked', async () => {
    const user = userEvent.setup();
    renderApp('/admin');
    const planned = await screen.findByRole('region', { name: 'Planned' });
    expect(within(planned).getByText('🍽️ Dishduty')).toBeInTheDocument();
    const fresh = screen.getByRole('region', { name: 'New' });
    expect(within(fresh).getByText('Too shy to keep this')).toBeInTheDocument();
    expect(within(fresh).getByTitle('Deleted by the author')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Show deleted' }));
    expect(within(fresh).queryByText('Too shy to keep this')).not.toBeInTheDocument();

    await user.click(within(planned).getByText('🍽️ Dishduty'));
    const dialog = screen.getByRole('dialog', { name: '🍽️ Dishduty' });
    expect(within(dialog).getByText(/alice@example.com/)).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: 'Status' })).toHaveValue('planned');
    expect(within(dialog).getByRole('textbox', { name: /Reply to the author/ })).toHaveValue('Love it, building it next!');
  });
});
