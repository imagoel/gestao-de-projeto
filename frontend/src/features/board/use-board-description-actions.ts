import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError, api } from "../../services/api";
import { useBoardPageContext } from "./board-page-context";

type UseBoardDescriptionActionsParams = {
  selectedCardId: string | null;
};

export function useBoardDescriptionActions({
  selectedCardId,
}: UseBoardDescriptionActionsParams) {
  const queryClient = useQueryClient();
  const { token } = useBoardPageContext();
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const createCardDescriptionMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedCardId) {
        throw new Error("Card nao selecionado.");
      }

      return api.createCardComment(token!, selectedCardId, { content });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["card-comments", selectedCardId],
      });
      setDescriptionError(null);
    },
    onError: (error) => {
      setDescriptionError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel registrar a descricao do card.",
      );
    },
  });

  const updateCardDescriptionMutation = useMutation({
    mutationFn: async (payload: { commentId: string; content: string }) =>
      api.updateCardComment(token!, payload.commentId, { content: payload.content }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["card-comments", selectedCardId],
      });
      setDescriptionError(null);
    },
    onError: (error) => {
      setDescriptionError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel editar a descricao do card.",
      );
    },
  });

  const deleteCardDescriptionMutation = useMutation({
    mutationFn: async (commentId: string) => api.deleteCardComment(token!, commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["card-comments", selectedCardId],
      });
      setDescriptionError(null);
    },
    onError: (error) => {
      setDescriptionError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel apagar a descricao do card.",
      );
    },
  });

  return {
    createCardDescriptionMutation,
    deleteCardDescriptionMutation,
    descriptionError,
    setDescriptionError,
    updateCardDescriptionMutation,
  };
}
