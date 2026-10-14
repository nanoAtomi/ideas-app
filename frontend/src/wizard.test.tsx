import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import i18n from './i18n';

describe('wizard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/me') return new Response(JSON.stringify({ id: 1, username: 'a', email: null, display_name: 'a', language: null, is_admin: false, portal_url: null, logout_url: null, feedback_url: null }));
      return new Response('[]');
    }));
  });

  // Regression: two siblings with the same key left earlier answers on the page (iPhone report).
  it('shows only the current question', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/submit']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await user.click(await screen.findByRole('button', { name: 'Weiter →' }));
    await user.type(screen.getByRole('textbox'), 'Test');
    await user.click(screen.getByRole('button', { name: 'Weiter →' }));
    await user.type(screen.getByRole('textbox'), 'Test2');
    await user.click(screen.getByRole('button', { name: 'Weiter →' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Wie oft');
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryByText('Neue App')).toBeNull();
  });
});
