import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export const FREQUENCIES = ['daily', 'weekly', 'monthly', 'rarely'] as const;
export const STATUSES = ['new', 'seen', 'planned', 'in_development', 'built', 'not_now'] as const;
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
  /** Direct imgur image URLs (the server normalizes what the user pasted). */
  image_links: string[];
  /** The app it is for; null = a new app. */
  concerns: string | null;
}

export interface Idea extends IdeaFields {
  id: number;
  status: Status;
  admin_reply: string | null;
  replied_at: string | null;
  /** An admin changed the texts; shown to the author until they edit again. */
  admin_edit_reason: string | null;
  admin_edited_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A saved state of an idea's texts (newest first in lists). */
export interface IdeaVersion {
  number: number;
  by_admin: boolean;
  /** Who saved it; for the author an admin's change has no name. */
  editor_name: string | null;
  reason: string | null;
  changed: (keyof IdeaFields)[];
  fields: IdeaFields;
  created_at: string;
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
  image_links: [],
  concerns: null,
};

export function useMyIdeas() {
  return useQuery({ queryKey: ['ideas', 'mine'], queryFn: () => api<Idea[]>('/api/ideas/mine') });
}

export function useIdea(id: number, enabled = true) {
  return useQuery({ queryKey: ['ideas', id], queryFn: () => api<Idea>(`/api/ideas/${id}`), enabled });
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

/** App names ideas were written for - choices in the wizard. */
export function useConcerns() {
  return useQuery({ queryKey: ['ideas', 'concerns'], queryFn: () => api<string[]>('/api/ideas/concerns'), staleTime: 60_000 });
}

/** The history of an idea: the author's own, or (admin) any idea's. */
export function useVersions(id: number, admin: boolean) {
  const base = admin ? `/api/admin/ideas/${id}` : `/api/ideas/${id}`;
  return useQuery({ queryKey: ['versions', admin, id], queryFn: () => api<IdeaVersion[]>(`${base}/versions`) });
}

export function useRestore(id: number, admin: boolean) {
  const queryClient = useQueryClient();
  const base = admin ? `/api/admin/ideas/${id}` : `/api/ideas/${id}`;
  return useMutation({
    mutationFn: ({ number, reason }: { number: number; reason?: string }) =>
      api<Idea>(`${base}/versions/${number}/restore`, { method: 'POST', body: admin ? { reason } : {} }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['versions'] });
      void queryClient.invalidateQueries({ queryKey: ['ideas'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ideas'] });
    },
  });
}

export function useAdminIdeas(enabled = true) {
  return useQuery({ queryKey: ['admin', 'ideas'], queryFn: () => api<AdminIdea[]>('/api/admin/ideas'), enabled });
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
    /** Changes the texts; the reason is shown to the author. */
    edit: useMutation({
      mutationFn: ({ id, ...body }: IdeaFields & { id: number; reason: string }) =>
        api<AdminIdea>(`/api/admin/ideas/${id}`, { method: 'PUT', body }),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: key });
        void queryClient.invalidateQueries({ queryKey: ['versions'] });
      },
    }),
    purge: useMutation({
      mutationFn: (id: number) => api<null>(`/api/admin/ideas/${id}`, { method: 'DELETE' }),
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    }),
  };
}

/** Just the editable answers of an idea (what PUT /api/ideas/{id} takes). */
export function ideaFields(idea: IdeaFields): IdeaFields {
  const { problem, audience, frequency, helps, name_idea, details, visibility, anonymous, image_links, concerns } = idea;
  return { problem, audience, frequency, helps, name_idea, details, visibility, anonymous, image_links, concerns };
}

/** An idea as everyone sees it on the board. */
export interface BoardIdea extends Omit<IdeaFields, 'visibility' | 'anonymous'> {
  id: number;
  status: Status;
  created_at: string;
  /** null = posted anonymously. */
  author_name: string | null;
  votes: number;
  voted: boolean;
  mine: boolean;
}

export type BoardSort = 'votes' | 'new';

export function useBoard(sort: BoardSort) {
  return useQuery({ queryKey: ['board', sort], queryFn: () => api<BoardIdea[]>(`/api/board?sort=${sort}`) });
}

export function useVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, voted }: { id: number; voted: boolean }) =>
      api<null>(`/api/board/${id}/vote`, { method: voted ? 'PUT' : 'DELETE' }),
    // Count the thumb right away; keep the order until the next refetch so cards don't jump.
    onMutate: ({ id, voted }) => {
      for (const sort of ['votes', 'new'] as BoardSort[]) {
        queryClient.setQueryData<BoardIdea[]>(['board', sort], (ideas) =>
          ideas?.map((idea) => (idea.id === id && idea.voted !== voted ? { ...idea, voted, votes: idea.votes + (voted ? 1 : -1) } : idea)),
        );
      }
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: ['board'] }),
  });
}

/** What the server accepts: single imgur images (see backend app/images.py). */
export const IMGUR_LINK = /^https:\/\/(?:(?:www|m)\.)?(i\.)?imgur\.com\/[A-Za-z0-9]{5,12}(?:\.(png|jpe?g|gif|webp))?\/?$/;
export const MAX_IMAGES = 3;
