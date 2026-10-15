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
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Edit profile/ })).toHaveAttribute('href', 'https://portal.example/profile');
    expect(screen.getByRole('link', { name: /Sign out/ })).toHaveAttribute('href', 'https://portal.example/logout');
    expect(screen.getByRole('link', { name: /Feedback/ })).toHaveAttribute('href', 'https://portal.example/feedback?app=ideas');
  });

  it('offers the admin board only to admins', async () => {
    renderApp('/admin');
    expect(await screen.findByText('This area is for admins only.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('shows the admin board to admins', async () => {
    me = { ...alice, is_admin: true };
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Admin board' })).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Main navigation' })[0];
    expect(within(nav).getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('switches language and appearance platform-wide', async () => {
    renderApp('/mine');
    expect(await screen.findByRole('heading', { name: 'My ideas' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    const language = screen.getByRole('combobox', { name: 'Language' });
    expect(language).toHaveValue('en');
    await userEvent.selectOptions(language, 'de');
    expect(await screen.findByRole('heading', { name: 'Meine Ideen' })).toBeInTheDocument();
    expect(document.cookie).toContain('nicasso-lang=de');

    await userEvent.click(screen.getByRole('button', { name: 'Dunkle Darstellung' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(document.cookie).toContain('nicasso-theme=dark');
    await userEvent.click(screen.getByRole('button', { name: 'Helle Darstellung' }));
    expect(document.cookie).toContain('nicasso-theme=light');
  });

  it('hides platform links outside the gateway', async () => {
    me = { ...alice, portal_url: null, logout_url: null, feedback_url: null };
    renderApp();
    await screen.findByRole('heading', { name: 'What bugs you in everyday life?' });
    expect(screen.queryByRole('link', { name: /portal/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.queryByRole('link', { name: /Sign out/ })).not.toBeInTheDocument();
  });
});
