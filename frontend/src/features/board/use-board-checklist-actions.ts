import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError, api } from "../../services/api";
import type { ChecklistItem } from "../../types/api";
import { useBoardPageContext } from "./board-page-context";

type UseBoardChecklistActionsParams = {
  selectedCardId: string | null;
};

export function useBoardChecklistActions({
  selectedCardId,
}: UseBoardChecklistActionsParams) {
  const queryClient = useQueryClient();
  const { token } = useBoardPageContext();
  const [checklistError, setChecklistError] = useState<string | null>(null);

  const createChecklistItemMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!selectedCardId) {
        throw new Error("Card nao selecionado.");
      }

      return api.createChecklistItem(token!, selectedCardId, { title });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["checklist", selectedCardId],
      });
      setChecklistError(null);
    },
    onError: (error) => {
      setChecklistError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel criar o item do checklist.",
      );
    },
  });

  const updateChecklistItemMutation = useMutation({
    mutationFn: async (payload: {
      itemId: string;
      title?: string;
      done?: boolean;
    }) =>
      api.updateChecklistItem(token!, payload.itemId, {
        title: payload.title,
        done: payload.done,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["checklist", selectedCardId],
      });
      setChecklistError(null);
    },
    onError: (error) => {
      setChecklistError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel atualizar o checklist.",
      );
    },
  });

  const reorderChecklistItemMutation = useMutation({
    mutationFn: async (payload: { itemId: string; targetPosition: number }) =>
      api.reorderChecklistItem(token!, payload.itemId, {
        targetPosition: payload.targetPosition,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["checklist", selectedCardId],
      });
      setChecklistError(null);
    },
    onError: (error) => {
      setChecklistError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel reordenar o checklist.",
      );
    },
  });

  const deleteChecklistItemMutation = useMutation({
    mutationFn: async (itemId: string) => api.deleteChecklistItem(token!, itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["checklist", selectedCardId],
      });
      setChecklistError(null);
    },
    onError: (error) => {
      setChecklistError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel excluir o item do checklist.",
      );
    },
  });

  async function handleChecklistToggle(item: ChecklistItem) {
    await updateChecklistItemMutation.mutateAsync({
      itemId: item.id,
      done: !item.done,
    });
  }

  async function handleChecklistRename(item: ChecklistItem, title: string) {
    await updateChecklistItemMutation.mutateAsync({
      itemId: item.id,
      title,
    });
  }

  async function handleChecklistMove(
    item: ChecklistItem,
    targetPosition: number,
  ) {
    await reorderChecklistItemMutation.mutateAsync({
      itemId: item.id,
      targetPosition,
    });
  }

  async function handleChecklistDelete(item: ChecklistItem) {
    await deleteChecklistItemMutation.mutateAsync(item.id);
  }

  function handleChecklistReferenceClick(referenceId: string) {
    const checklistItem = document.querySelector<HTMLElement>(
      `[data-checklist-item-id="${referenceId}"]`,
    );

    if (!checklistItem) {
      return;
    }

    checklistItem.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    checklistItem.classList.add("checklist-item-highlight");

    window.setTimeout(() => {
      checklistItem.classList.remove("checklist-item-highlight");
    }, 1200);
  }

  return {
    checklistError,
    createChecklistItemMutation,
    deleteChecklistItemMutation,
    handleChecklistDelete,
    handleChecklistMove,
    handleChecklistReferenceClick,
    handleChecklistRename,
    handleChecklistToggle,
    reorderChecklistItemMutation,
    setChecklistError,
    updateChecklistItemMutation,
  };
}
