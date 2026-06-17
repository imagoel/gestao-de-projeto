import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError, api } from "../../services/api";
import type { BoardColumn } from "../../types/api";
import { useBoardPageContext } from "./board-page-context";

type UseBoardColumnActionsParams = {
  boardId?: string;
};

export function useBoardColumnActions({
  boardId,
}: UseBoardColumnActionsParams) {
  const queryClient = useQueryClient();
  const { projectId, token } = useBoardPageContext();
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [columnError, setColumnError] = useState<string | null>(null);

  const renameColumnMutation = useMutation({
    mutationFn: async (payload: { columnId: string; title: string }) =>
      api.updateColumn(token!, payload.columnId, { title: payload.title }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      setEditingColumnId(null);
      setColumnError(null);
    },
    onError: (error) => {
      setColumnError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel renomear a coluna.",
      );
    },
  });

  const addColumnMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!boardId) {
        throw new Error("Board nao encontrado.");
      }

      return api.createColumn(token!, boardId, { title });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      setNewColumnTitle("");
      setIsAddColumnOpen(false);
      setColumnError(null);
    },
    onError: (error) => {
      setColumnError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel adicionar a coluna.",
      );
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => api.deleteColumn(token!, columnId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      setColumnError(null);
    },
    onError: (error) => {
      setColumnError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel remover a coluna.",
      );
    },
  });

  const reorderColumnMutation = useMutation({
    mutationFn: async (payload: { columnId: string; targetPosition: number }) =>
      api.reorderColumn(token!, payload.columnId, {
        targetPosition: payload.targetPosition,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      setColumnError(null);
    },
    onError: (error) => {
      setColumnError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel reordenar a coluna.",
      );
    },
  });

  function handleStartEditingColumn(column: BoardColumn) {
    setEditingColumnId(column.id);
    setEditingColumnTitle(column.title);
  }

  function handleRenameColumn(columnId: string, title: string) {
    void renameColumnMutation.mutateAsync({ columnId, title });
  }

  return {
    addColumnMutation,
    columnError,
    deleteColumnMutation,
    editingColumnId,
    editingColumnTitle,
    handleRenameColumn,
    handleStartEditingColumn,
    isAddColumnOpen,
    newColumnTitle,
    renameColumnMutation,
    reorderColumnMutation,
    setColumnError,
    setEditingColumnId,
    setEditingColumnTitle,
    setIsAddColumnOpen,
    setNewColumnTitle,
  };
}
