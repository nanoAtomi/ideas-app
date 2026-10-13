import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface Me {
  id: number;
  username: string;
  email: string | null;
  display_name: string;
  language: 'de' | 'en' | null;
  /** Listed in ADMIN_USERS: sees the admin board. */
  is_admin: boolean;
  /** Set by the portal; null when running outside the gateway. */
  portal_url: string | null;
  logout_url: string | null;
  feedback_url: string | null;
}

export type MeUpdate = Partial<Pick<Me, 'display_name'>> & { language?: 'de' | 'en' | '' };

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/api/me') });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (update: MeUpdate) => api<Me>('/api/me', { method: 'PATCH', body: update }),
    onSuccess: (me) => queryClient.setQueryData(['me'], me),
  });
}
