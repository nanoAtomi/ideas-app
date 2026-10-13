import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Me } from './api/me';
import { App } from './App';
import i18n from './i18n';

const alice: Me = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  display_name: 'alice',
  language: null,
  is_admin: false,
  portal_url: 'https://portal.example',
  logout_url: 'https://portal.example/logout',
  feedback_url: 'https://portal.example/feedback?app=ideas',
};

let me: Me;
let fetchMock: ReturnType<typeof vi.fn>;

function renderApp(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    me = alice;
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/me' && init?.method === 'PATCH') {
        return new Response(JSON.stringify({ ...me, ...JSON.parse(String(init.body)) }));
      }
      if (url === '/api/me') return new Response(JSON.stringify(me));
      return new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the board hero and the platform links', async () => {
    renderApp();
    expect(await screen.findByRole('heading', { name: 'What bugs you in everyday life?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /portal/i })).toHaveAttribute('href', 'https://portal.example');
    expect(screen.getAllByRole('link', { name: 'Sign out' })[0]).toHaveAttribute('href', 'https://portal.example/logout');
    expect(screen.getAllByRole('link', { name: 'Feedback' })[0]).toHaveAttribute('href', 'https://portal.example/feedback?app=ideas');
  });

  it('offers the admin board only to admins', async () => {
    renderApp('/admin');
    expect(await screen.findByText('This area is for admins only.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('shows the admin board to admins', async () => {
    me = { ...alice, is_admin: true };
    renderApp('/admin');
    expect(await screen.findByText(/sort every idea here/)).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Main navigation' })[0];
    expect(within(nav).getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('switches the language and saves it', async () => {
    renderApp('/mine');
    expect(await screen.findByRole('heading', { name: 'My ideas' })).toBeInTheDocument();
    const switcher = screen.getAllByRole('group', { name: 'Language' })[0];
    expect(within(switcher).getByRole('button', { name: 'en' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(switcher).getByRole('button', { name: 'de' }));
    expect(await screen.findByRole('heading', { name: 'Meine Ideen' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/me', expect.objectContaining({ method: 'PATCH', body: '{"language":"de"}' }));
  });

  it('hides platform links outside the gateway', async () => {
    me = { ...alice, portal_url: null, logout_url: null, feedback_url: null };
    renderApp();
    await screen.findByRole('heading', { name: 'What bugs you in everyday life?' });
    expect(screen.queryByRole('link', { name: /portal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign out' })).not.toBeInTheDocument();
  });
});
