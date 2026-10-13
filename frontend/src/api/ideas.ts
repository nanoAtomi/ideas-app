import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export const FREQUENCIES = ['daily', 'weekly', 'monthly', 'rarely'] as const;
export const STATUSES = ['new', 'seen', 'planned', 'built', 'not_now'] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export type Status = (typeof STATUSES)[number];
export type Visibility = 'board' | 'private';

/** The wizard's answers - what the author can submit and edit. */
export interface IdeaFields {
  problem: string;
  audience: string | null;
  frequency: Frequency | null;
  helps: string | null;
  name_idea: string | null;
  details: string | null;
  visibility: Visibility;
  anonymous: boolean;
}

export interface Idea extends IdeaFields {
  id: number;
  status: Status;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminIdea extends Idea {
  author: { id: number; username: string; display_name: string; email: string | null };
  position: number;
  hidden: boolean;
  deleted_at: string | null;
}

export type AdminIdeaUpdate = Partial<Pick<AdminIdea, 'status' | 'position' | 'hidden'>> & { admin_reply?: string };

export const EMPTY_IDEA: IdeaFields = {
  problem: '',
  audience: null,
  frequency: null,
  helps: null,
  name_idea: null,
  details: null,
  visibility: 'board',
  anonymous: false,
};

export function useMyIdeas() {
  return useQuery({ queryKey: ['ideas', 'mine'], queryFn: () => api<Idea[]>('/api/ideas/mine') });
}

export function useIdea(id: number) {
  return useQuery({ queryKey: ['ideas', id], queryFn: () => api<Idea>(`/api/ideas/${id}`) });
}

export function useIdeaActions() {
  const queryClient = useQueryClient();
  const onSuccess = () => void queryClient.invalidateQueries({ queryKey: ['ideas'] });
  return {
    submit: useMutation({
      mutationFn: (fields: IdeaFields) => api<Idea>('/api/ideas', { method: 'POST', body: fields }),
      onSuccess,
    }),
    edit: useMutation({
      mutationFn: ({ id, ...fields }: IdeaFields & { id: number }) => api<Idea>(`/api/ideas/${id}`, { method: 'PUT', body: fields }),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: number) => api<null>(`/api/ideas/${id}`, { method: 'DELETE' }),
      onSuccess,
    }),
  };
}

export function useAdminIdeas() {
  return useQuery({ queryKey: ['admin', 'ideas'], queryFn: () => api<AdminIdea[]>('/api/admin/ideas') });
}

export function useAdminActions() {
  const queryClient = useQueryClient();
  const key = ['admin', 'ideas'];
  return {
    update: useMutation({
      mutationFn: ({ id, ...update }: AdminIdeaUpdate & { id: number }) =>
        api<AdminIdea>(`/api/admin/ideas/${id}`, { method: 'PATCH', body: update }),
      // Move the card right away; the server's answer (or a refetch on error) settles it.
      onMutate: ({ id, admin_reply: _reply, ...update }) => {
        queryClient.setQueryData<AdminIdea[]>(key, (ideas) => ideas?.map((idea) => (idea.id === id ? { ...idea, ...update } : idea)));
      },
      onSuccess: (saved) => queryClient.setQueryData<AdminIdea[]>(key, (ideas) => ideas?.map((idea) => (idea.id === saved.id ? saved : idea))),
      onError: () => void queryClient.invalidateQueries({ queryKey: key }),
    }),
    purge: useMutation({
      mutationFn: (id: number) => api<null>(`/api/admin/ideas/${id}`, { method: 'DELETE' }),
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    }),
  };
}

/** Just the editable answers of an idea (what PUT /api/ideas/{id} takes). */
export function ideaFields(idea: IdeaFields): IdeaFields {
  const { problem, audience, frequency, helps, name_idea, details, visibility, anonymous } = idea;
  return { problem, audience, frequency, helps, name_idea, details, visibility, anonymous };
}
