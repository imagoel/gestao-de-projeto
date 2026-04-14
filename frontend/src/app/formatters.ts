import type { CardPriority, ProjectStatus } from '../types/api';

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
});

const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatShortDate(value?: string | null) {
  if (!value) {
    return 'Sem prazo';
  }

  return shortDateFormatter.format(new Date(value));
}

export function getDueDateTone(value?: string | null) {
  if (!value) {
    return 'task-due task-due-muted';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(value);
  dueDate.setHours(0, 0, 0, 0);

  if (dueDate.getTime() < today.getTime()) {
    return 'task-due task-due-late';
  }

  return 'task-due task-due-normal';
}

export function formatLongDate(value?: string | null) {
  if (!value) {
    return 'Nao definido';
  }

  return longDateFormatter.format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Agora';
  }

  return dateTimeFormatter.format(new Date(value));
}

export function toDateInputValue(value?: string | null) {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

export function formatProjectStatus(status: ProjectStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Ativo';
    case 'PAUSED':
      return 'Pausado';
    case 'COMPLETED':
      return 'Concluido';
    case 'ARCHIVED':
      return 'Arquivado';
    default:
      return status;
  }
}

export function getProjectStatusTone(status: ProjectStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'badge-green';
    case 'PAUSED':
      return 'badge-amber';
    case 'COMPLETED':
      return 'badge-blue';
    case 'ARCHIVED':
      return 'badge-gray';
    default:
      return 'badge-gray';
  }
}

export function formatPriority(priority: CardPriority) {
  switch (priority) {
    case 'LOW':
      return 'Baixa';
    case 'MEDIUM':
      return 'Media';
    case 'HIGH':
      return 'Alta';
    case 'CRITICAL':
      return 'Critica';
    default:
      return priority;
  }
}

export function getPriorityTone(priority: CardPriority) {
  switch (priority) {
    case 'LOW':
      return 'badge-gray';
    case 'MEDIUM':
      return 'badge-blue';
    case 'HIGH':
      return 'badge-amber';
    case 'CRITICAL':
      return 'badge-red';
    default:
      return 'badge-gray';
  }
}
