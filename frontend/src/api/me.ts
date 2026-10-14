import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface Me {
  id: number;
  username: string;
  email: string | null;
  display_name: string;
  language: 'de' | 'en' | null;
  /** Has the app role "admin" (portal): sees the admin board. */
  is_admin: boolean;
  /** Set by the portal; null when running outside the gateway. */
  portal_url: string | null;
  logout_url: string | null;
  feedback_url: string | null;
}

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/api/me') });
}
