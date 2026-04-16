import type {
  ApiUser,
  AuthResponse,
  CardComment,
  CardDetail,
  CardPriority,
  ChecklistItem,
  Project,
  ProjectBoard,
  ProjectFolder,
  ProjectRole,
} from '../types/api';

const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string | null;
};

function extractMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const candidate = payload as { message?: string | string[] };

  if (Array.isArray(candidate.message)) {
    return candidate.message.join(' ');
  }

  if (typeof candidate.message === 'string') {
    return candidate.message;
  }

  return fallback;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const { body, token, headers, ...rest } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(
      extractMessage(payload, 'Nao foi possivel concluir a requisicao.'),
      response.status,
      payload,
    );
  }

  return payload as T;
}

export const api = {
  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  getMe(token: string) {
    return request<ApiUser>('/auth/me', { token });
  },

  getUsers(token: string) {
    return request<ApiUser[]>('/users', { token });
  },

  createUser(
    token: string,
    payload: {
      name: string;
      email: string;
      password: string;
      role: ApiUser['role'];
      avatarUrl?: string;
    },
  ) {
    return request<ApiUser>('/users', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  updateUser(
    token: string,
    userId: string,
    payload: {
      name?: string;
      email?: string;
      password?: string;
      role?: ApiUser['role'];
      avatarUrl?: string;
    },
  ) {
    return request<ApiUser>(`/users/${userId}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  getProjects(token: string) {
    return request<Project[]>('/projects', { token });
  },

  getProject(token: string, projectId: string) {
    return request<Project>(`/projects/${projectId}`, { token });
  },

  createProject(
    token: string,
    payload: {
      name: string;
      description?: string;
      deadline?: string | null;
      ownerId?: string;
      memberIds?: string[];
    },
  ) {
    return request<Project>('/projects', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  updateProject(
    token: string,
    projectId: string,
    payload: { folderId?: string | null; name?: string },
  ) {
    return request<Project>(`/projects/${projectId}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  getFolders(token: string) {
    return request<ProjectFolder[]>('/folders', { token });
  },

  createFolder(token: string, payload: { name: string }) {
    return request<ProjectFolder>('/folders', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  updateFolder(token: string, folderId: string, payload: { name: string }) {
    return request<ProjectFolder>(`/folders/${folderId}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  deleteFolder(token: string, folderId: string) {
    return request<{ success: true }>(`/folders/${folderId}`, {
      method: 'DELETE',
      token,
    });
  },

  deleteProject(token: string, projectId: string) {
    return request<{ success: true }>(`/projects/${projectId}`, {
      method: 'DELETE',
      token,
    });
  },

  addProjectMember(
    token: string,
    projectId: string,
    payload: { userId: string; role?: ProjectRole },
  ) {
    return request(`/projects/${projectId}/members`, {
      method: 'POST',
      token,
      body: payload,
    });
  },

  removeProjectMember(token: string, projectId: string, userId: string) {
    return request<{ success: true }>(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
      token,
    });
  },

  createColumn(token: string, boardId: string, payload: { title: string }) {
    return request<{ id: string; title: string; position: number }>(
      `/boards/${boardId}/columns`,
      { method: 'POST', token, body: payload },
    );
  },

  updateColumn(token: string, columnId: string, payload: { title: string }) {
    return request<{ id: string; title: string; position: number }>(
      `/columns/${columnId}`,
      { method: 'PATCH', token, body: payload },
    );
  },

  reorderColumn(token: string, columnId: string, payload: { targetPosition: number }) {
    return request<{ id: string; title: string; position: number }>(
      `/columns/${columnId}/reorder`,
      { method: 'PATCH', token, body: payload },
    );
  },

  deleteColumn(token: string, columnId: string) {
    return request<{ success: true }>(`/columns/${columnId}`, {
      method: 'DELETE',
      token,
    });
  },

  getProjectBoard(token: string, projectId: string) {
    return request<ProjectBoard>(`/projects/${projectId}/board`, { token });
  },

  getCard(token: string, cardId: string) {
    return request<CardDetail>(`/cards/${cardId}`, { token });
  },

  getChecklistItems(token: string, cardId: string) {
    return request<ChecklistItem[]>(`/cards/${cardId}/checklist-items`, { token });
  },

  createChecklistItem(token: string, cardId: string, payload: { title: string }) {
    return request<ChecklistItem>(`/cards/${cardId}/checklist-items`, {
      method: 'POST',
      token,
      body: payload,
    });
  },

  updateChecklistItem(
    token: string,
    itemId: string,
    payload: {
      title?: string;
      done?: boolean;
    },
  ) {
    return request<ChecklistItem>(`/checklist-items/${itemId}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  reorderChecklistItem(
    token: string,
    itemId: string,
    payload: {
      targetPosition: number;
    },
  ) {
    return request<ChecklistItem>(`/checklist-items/${itemId}/reorder`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  getCardComments(token: string, cardId: string) {
    return request<CardComment[]>(`/cards/${cardId}/comments`, { token });
  },

  createCardComment(token: string, cardId: string, payload: { content: string }) {
    return request<CardComment>(`/cards/${cardId}/comments`, {
      method: 'POST',
      token,
      body: payload,
    });
  },

  createCard(
    token: string,
    columnId: string,
    payload: {
      title: string;
      description?: string;
      assigneeId: string;
      priority: CardPriority;
      dueDate?: string | null;
    },
  ) {
    return request<CardDetail>(`/columns/${columnId}/cards`, {
      method: 'POST',
      token,
      body: payload,
    });
  },

  updateCard(
    token: string,
    cardId: string,
    payload: {
      title: string;
      description?: string;
      assigneeId: string;
      priority: CardPriority;
      dueDate?: string | null;
    },
  ) {
    return request<CardDetail>(`/cards/${cardId}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  moveCard(
    token: string,
    cardId: string,
    payload: {
      targetColumnId: string;
      targetPosition: number;
    },
  ) {
    return request<CardDetail>(`/cards/${cardId}/move`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  archiveCard(token: string, cardId: string) {
    return request<CardDetail>(`/cards/${cardId}/archive`, {
      method: 'PATCH',
      token,
    });
  },
};
