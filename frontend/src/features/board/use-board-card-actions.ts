import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Dispatch,
  FormEvent,
  SetStateAction,
} from "react";

import { ApiError, api } from "../../services/api";
import type { BoardCard, CardPriority } from "../../types/api";
import {
  initialCreateCardForm,
  type CreateCardFormState,
  type EditCardFormState,
} from "./board-form-state";
import { useBoardPageContext } from "./board-page-context";

type UseBoardCardActionsParams = {
  createCardForm: CreateCardFormState;
  editCardForm: EditCardFormState;
  selectedCardId: string | null;
  setBoardActionError: Dispatch<SetStateAction<string | null>>;
  setCreateCardForm: Dispatch<SetStateAction<CreateCardFormState>>;
  setCreateError: Dispatch<SetStateAction<string | null>>;
  setEditError: Dispatch<SetStateAction<string | null>>;
  setIsCreateModalOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedCardId: Dispatch<SetStateAction<string | null>>;
};

export function useBoardCardActions({
  createCardForm,
  editCardForm,
  selectedCardId,
  setBoardActionError,
  setCreateCardForm,
  setCreateError,
  setEditError,
  setIsCreateModalOpen,
  setSelectedCardId,
}: UseBoardCardActionsParams) {
  const queryClient = useQueryClient();
  const { projectId, token } = useBoardPageContext();

  const createCardMutation = useMutation({
    mutationFn: () =>
      api.createCard(token!, createCardForm.columnId, {
        assigneeId: createCardForm.assigneeId,
        dueDate: createCardForm.dueDate || null,
        priority: createCardForm.priority,
        title: createCardForm.title,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      setIsCreateModalOpen(false);
      setCreateCardForm(initialCreateCardForm);
      setCreateError(null);
    },
    onError: (error) => {
      setCreateError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel criar o card.",
      );
    },
  });

  const saveCardMutation = useMutation({
    mutationFn: () => {
      if (!selectedCardId) {
        throw new Error("Card nao selecionado.");
      }

      return api.updateCard(token!, selectedCardId, {
        assigneeId: editCardForm.assigneeId,
        dueDate: editCardForm.dueDate || null,
        priority: editCardForm.priority,
        title: editCardForm.title,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["board", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["card", selectedCardId] }),
        queryClient.invalidateQueries({ queryKey: ["archived-cards", projectId] }),
      ]);
      setSelectedCardId(null);
      setEditError(null);
    },
    onError: (error) => {
      setEditError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel salvar o card.",
      );
    },
  });

  const archiveCardMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCardId) {
        throw new Error("Card nao selecionado.");
      }

      return api.archiveCard(token!, selectedCardId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["board", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["card", selectedCardId] }),
      ]);
      setSelectedCardId(null);
      setEditError(null);
    },
    onError: (error) => {
      setEditError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel arquivar o card.",
      );
    },
  });

  const dragMoveCardMutation = useMutation({
    mutationFn: async (payload: {
      cardId: string;
      targetColumnId: string;
      targetPosition: number;
    }) =>
      api.moveCard(token!, payload.cardId, {
        targetColumnId: payload.targetColumnId,
        targetPosition: payload.targetPosition,
      }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["board", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["card", variables.cardId] }),
      ]);
      setBoardActionError(null);
    },
    onError: (error) => {
      setBoardActionError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel mover o card no quadro.",
      );
    },
  });

  const restoreCardMutation = useMutation({
    mutationFn: async (cardId: string) => api.restoreCard(token!, cardId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["board", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["archived-cards", projectId] }),
      ]);
      setBoardActionError(null);
    },
    onError: (error) => {
      setBoardActionError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel restaurar o card arquivado.",
      );
    },
  });

  const renameCardMutation = useMutation({
    mutationFn: async (payload: {
      cardId: string;
      title: string;
      assigneeId: string;
      priority: CardPriority;
      description?: string | null;
      dueDate?: string | null;
    }) =>
      api.updateCard(token!, payload.cardId, {
        title: payload.title,
        assigneeId: payload.assigneeId,
        priority: payload.priority,
        description: payload.description ?? undefined,
        dueDate: payload.dueDate ?? null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      setBoardActionError(null);
    },
    onError: (error) => {
      setBoardActionError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel renomear o card.",
      );
    },
  });

  async function handleCreateCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    await createCardMutation.mutateAsync();
  }

  async function handleSaveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditError(null);
    await saveCardMutation.mutateAsync();
  }

  function handleRenameCard(card: BoardCard, title: string) {
    void renameCardMutation.mutateAsync({
      cardId: card.id,
      title,
      assigneeId: card.assignee?.id ?? "",
      priority: card.priority,
      description: card.description,
      dueDate: card.dueDate,
    });
  }

  return {
    archiveCardMutation,
    createCardMutation,
    dragMoveCardMutation,
    handleCreateCard,
    handleRenameCard,
    handleSaveCard,
    renameCardMutation,
    restoreCardMutation,
    saveCardMutation,
  };
}
