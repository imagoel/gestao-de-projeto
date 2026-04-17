import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../app/auth-provider";
import {
  formatPriority,
  formatShortDate,
  getDueDateTone,
  getPriorityTone,
  toDateInputValue,
} from "../app/formatters";
import { AppShell } from "../components/app-shell";
import { Modal } from "../components/modal";
import { StatusState } from "../components/status-state";
import { CardChecklistSection } from "../features/cards/card-checklist-section";
import { CardCommentsSection } from "../features/cards/card-comments-section";
import { ApiError, api } from "../services/api";
import type { BoardColumn, CardPriority, ChecklistItem } from "../types/api";

type CreateCardFormState = {
  assigneeId: string;
  columnId: string;
  description: string;
  dueDate: string;
  priority: CardPriority;
  title: string;
};

type EditCardFormState = {
  assigneeId: string;
  description: string;
  dueDate: string;
  priority: CardPriority;
  targetColumnId: string;
  targetPosition: number;
  title: string;
};

const initialCreateCardForm: CreateCardFormState = {
  assigneeId: "",
  columnId: "",
  description: "",
  dueDate: "",
  priority: "MEDIUM",
  title: "",
};

const initialEditCardForm: EditCardFormState = {
  assigneeId: "",
  description: "",
  dueDate: "",
  priority: "MEDIUM",
  targetColumnId: "",
  targetPosition: 0,
  title: "",
};

const priorityOptions: CardPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Feature flag: column management UI (reorder arrows + add new column).
// Hidden for the current MVP; toggle to re-enable in the future.
const SHOW_COLUMN_MANAGEMENT = false;

const PRIORITY_WEIGHT: Record<CardPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

type DragCardState = {
  cardId: string;
  sourceColumnId: string;
  sourcePosition: number;
};

function getPositionOptions(
  columns: BoardColumn[],
  targetColumnId: string,
  currentCardId?: string,
) {
  const column = columns.find((item) => item.id === targetColumnId);

  if (!column) {
    return [];
  }

  const cardCount = currentCardId
    ? column.cards.filter((card) => card.id !== currentCardId).length
    : column.cards.length;

  return Array.from({ length: cardCount + 1 }, (_, index) => ({
    label: `${index + 1} de ${cardCount + 1}`,
    value: index,
  }));
}

export function ProjectBoardPage() {
  const queryClient = useQueryClient();
  const { token, user } = useAuth();
  const { projectId = "" } = useParams();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCardForm, setCreateCardForm] = useState<CreateCardFormState>(
    initialCreateCardForm,
  );
  const [editCardForm, setEditCardForm] =
    useState<EditCardFormState>(initialEditCardForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [boardActionError, setBoardActionError] = useState<string | null>(null);
  const [dragCard, setDragCard] = useState<DragCardState | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    columnId: string;
    position: number;
  } | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [columnError, setColumnError] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(token!, projectId),
    enabled: Boolean(token && projectId),
  });

  const boardQuery = useQuery({
    queryKey: ["board", projectId],
    queryFn: () => api.getProjectBoard(token!, projectId),
    enabled: Boolean(token && projectId),
  });

  const cardQuery = useQuery({
    queryKey: ["card", selectedCardId],
    queryFn: () => api.getCard(token!, selectedCardId!),
    enabled: Boolean(token && selectedCardId),
  });

  const checklistQuery = useQuery({
    queryKey: ["checklist", selectedCardId],
    queryFn: () => api.getChecklistItems(token!, selectedCardId!),
    enabled: Boolean(token && selectedCardId),
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", selectedCardId],
    queryFn: () => api.getCardComments(token!, selectedCardId!),
    enabled: Boolean(token && selectedCardId),
  });

  const memberOptions =
    projectQuery.data?.members.map((member) => member.user) ?? [];
  const columns = useMemo(() => {
    const raw = boardQuery.data?.columns ?? [];
    return raw.map((col) => ({
      ...col,
      cards: [...col.cards].sort(
        (a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority],
      ),
    }));
  }, [boardQuery.data?.columns]);
  const currentProjectMember = projectQuery.data?.members.find(
    (member) => member.user.id === user?.id,
  );
  const canEditProject = Boolean(
    user &&
    (user.role === "ADMIN" ||
      projectQuery.data?.ownerId === user.id ||
      currentProjectMember?.role === "MANAGER" ||
      currentProjectMember?.role === "MEMBER"),
  );
  const isReadOnlyProject = Boolean(projectQuery.data && !canEditProject);

  useEffect(() => {
    if (!cardQuery.data) {
      return;
    }

    const assigneeId =
      cardQuery.data.assignee?.id ?? memberOptions[0]?.id ?? "";

    // Only set form if we have a valid assignee or member options
    if (!assigneeId && memberOptions.length === 0) {
      // Card has no assignee and no members available - keep it empty but valid
      setEditCardForm({
        assigneeId: "",
        description: cardQuery.data.description ?? "",
        dueDate: toDateInputValue(cardQuery.data.dueDate),
        priority: cardQuery.data.priority,
        targetColumnId: cardQuery.data.columnId,
        targetPosition: cardQuery.data.position,
        title: cardQuery.data.title,
      });
    } else {
      setEditCardForm({
        assigneeId,
        description: cardQuery.data.description ?? "",
        dueDate: toDateInputValue(cardQuery.data.dueDate),
        priority: cardQuery.data.priority,
        targetColumnId: cardQuery.data.columnId,
        targetPosition: cardQuery.data.position,
        title: cardQuery.data.title,
      });
    }
    setEditError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardQuery.data?.id]);

  const createCardMutation = useMutation({
    mutationFn: () =>
      api.createCard(token!, createCardForm.columnId, {
        assigneeId: createCardForm.assigneeId,
        description: createCardForm.description || undefined,
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
    mutationFn: async () => {
      if (!selectedCardId) {
        throw new Error("Card nao selecionado.");
      }

      // Debug logging
      console.log("[DEBUG] Saving card:", {
        cardId: selectedCardId,
        formData: editCardForm,
      });

      const savedCard = await api.updateCard(token!, selectedCardId, {
        assigneeId: editCardForm.assigneeId,
        description: editCardForm.description || undefined,
        dueDate: editCardForm.dueDate || null,
        priority: editCardForm.priority,
        title: editCardForm.title,
      });

      console.log("[DEBUG] Card updated:", savedCard);

      const shouldMove =
        editCardForm.targetColumnId !== savedCard.column.id ||
        editCardForm.targetPosition !== savedCard.position;

      if (!shouldMove) {
        return savedCard;
      }

      return api.moveCard(token!, selectedCardId, {
        targetColumnId: editCardForm.targetColumnId,
        targetPosition: editCardForm.targetPosition,
      });
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
      console.error("[DEBUG] Save card error:", error);
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
      setDragCard(null);
      setDropTarget(null);
    },
    onError: (error) => {
      setBoardActionError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel mover o card no quadro.",
      );
      setDragCard(null);
      setDropTarget(null);
    },
  });

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
      const board = boardQuery.data;
      if (!board) throw new Error("Board nao encontrado.");
      return api.createColumn(token!, board.id, { title });
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

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedCardId) {
        throw new Error("Card nao selecionado.");
      }

      return api.createCardComment(token!, selectedCardId, { content });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["comments", selectedCardId],
      });
      setCommentError(null);
    },
    onError: (error) => {
      setCommentError(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel publicar o comentario.",
      );
    },
  });

  function openCreateCardModal(columnId?: string) {
    setCreateCardForm({
      ...initialCreateCardForm,
      assigneeId: memberOptions[0]?.id ?? "",
      columnId: columnId ?? columns[0]?.id ?? "",
      priority: "MEDIUM",
    });
    setBoardActionError(null);
    setCreateError(null);
    setIsCreateModalOpen(true);
  }

  function openCardDetails(cardId: string) {
    if (dragCard) {
      return;
    }

    setBoardActionError(null);
    setEditError(null);
    setChecklistError(null);
    setCommentError(null);
    setSelectedCardId(cardId);
  }

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

  const positionOptions = getPositionOptions(
    columns,
    editCardForm.targetColumnId,
    selectedCardId ?? undefined,
  );
  const canCreateCard =
    canEditProject && columns.length > 0 && memberOptions.length > 0;
  const currentCardColumnName = columns.find(
    (column) => column.id === cardQuery.data?.columnId,
  )?.title;
  const checklistItems = checklistQuery.data ?? [];
  const checklistErrorMessage =
    checklistError ??
    (checklistQuery.error instanceof Error
      ? checklistQuery.error.message
      : null);
  const commentErrorMessage =
    commentError ??
    (commentsQuery.error instanceof Error ? commentsQuery.error.message : null);

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

  function handleDragStart(
    cardId: string,
    sourceColumnId: string,
    sourcePosition: number,
  ) {
    if (!canEditProject) {
      return;
    }

    setBoardActionError(null);
    setDragCard({
      cardId,
      sourceColumnId,
      sourcePosition,
    });
    setDropTarget({
      columnId: sourceColumnId,
      position: sourcePosition,
    });
  }

  function handleDragEnd() {
    setDragCard(null);
    setDropTarget(null);
  }

  function handleDropTargetDragOver(
    event: DragEvent<HTMLElement>,
    columnId: string,
    position: number,
  ) {
    if (!dragCard || !canEditProject || dragMoveCardMutation.isPending) {
      return;
    }

    event.preventDefault();

    if (dropTarget?.columnId !== columnId || dropTarget.position !== position) {
      setDropTarget({ columnId, position });
    }
  }

  async function handleDrop(
    event: DragEvent<HTMLElement>,
    columnId: string,
    position: number,
  ) {
    event.preventDefault();

    if (!dragCard || dragMoveCardMutation.isPending) {
      return;
    }

    if (
      dragCard.sourceColumnId === columnId &&
      dragCard.sourcePosition === position
    ) {
      setDragCard(null);
      setDropTarget(null);
      return;
    }

    await dragMoveCardMutation.mutateAsync({
      cardId: dragCard.cardId,
      targetColumnId: columnId,
      targetPosition: position,
    });
  }

  function getDropZoneClassName(columnId: string, position: number) {
    return dropTarget?.columnId === columnId && dropTarget.position === position
      ? "board-drop-zone board-drop-zone-active"
      : "board-drop-zone";
  }

  return (
    <AppShell
      title={projectQuery.data?.name ?? "Quadro Kanban"}
      subtitle="Projetos / quadro"
      copy={projectQuery.data?.description || undefined}
      action={
        <div className="page-header-actions">
          <Link className="secondary-button" to={`/projetos/${projectId}`}>
            Ver detalhes
          </Link>
          {SHOW_COLUMN_MANAGEMENT && canEditProject ? (
            <button
              className="secondary-button"
              onClick={() => {
                setNewColumnTitle("");
                setColumnError(null);
                setIsAddColumnOpen(true);
              }}
              type="button"
            >
              Nova coluna
            </button>
          ) : null}
          <button
            className="primary-button"
            disabled={!canCreateCard}
            onClick={() => openCreateCardModal()}
            type="button"
          >
            Novo card
          </button>
        </div>
      }
    >
      {isReadOnlyProject ? (
        <p className="field-helper board-inline-note">
          Seu perfil neste projeto e somente leitura. Voce pode acompanhar o
          board e abrir os cards, mas sem alterar conteudo.
        </p>
      ) : null}

      {boardActionError ? (
        <p className="form-error board-inline-error">{boardActionError}</p>
      ) : null}

      {columnError ? (
        <p className="form-error board-inline-error">{columnError}</p>
      ) : null}

      {projectQuery.isLoading || boardQuery.isLoading ? (
        <StatusState
          tone="loading"
          title="Carregando quadro"
          copy="Estamos montando o board e distribuindo os cards por coluna."
        />
      ) : null}

      {projectQuery.isError || boardQuery.isError ? (
        <StatusState
          tone="error"
          title="Nao foi possivel carregar o quadro"
          copy={
            projectQuery.error instanceof Error
              ? projectQuery.error.message
              : boardQuery.error instanceof Error
                ? boardQuery.error.message
                : "Tente novamente em instantes."
          }
          action={
            <button
              className="secondary-button"
              onClick={() => {
                void projectQuery.refetch();
                void boardQuery.refetch();
              }}
              type="button"
            >
              Recarregar
            </button>
          }
        />
      ) : null}

      {!projectQuery.isLoading &&
      !boardQuery.isLoading &&
      !projectQuery.isError &&
      !boardQuery.isError ? (
        columns.length > 0 ? (
          <section className="board-grid">
            {columns.map((column) => (
              <article className="board-column" key={column.id}>
                <div className="board-column-header">
                  {editingColumnId === column.id ? (
                    <form
                      className="inline-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editingColumnTitle.trim()) {
                          void renameColumnMutation.mutateAsync({
                            columnId: column.id,
                            title: editingColumnTitle.trim(),
                          });
                        }
                      }}
                      style={{ flex: 1 }}
                    >
                      <input
                        autoFocus
                        className="field-input"
                        onChange={(e) => setEditingColumnTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingColumnId(null);
                        }}
                        style={{ padding: "6px 10px", fontSize: "0.9rem" }}
                        type="text"
                        value={editingColumnTitle}
                      />
                      <button className="text-button" type="submit">
                        OK
                      </button>
                    </form>
                  ) : (
                    <span
                      onDoubleClick={() => {
                        if (canEditProject) {
                          setEditingColumnId(column.id);
                          setEditingColumnTitle(column.title);
                        }
                      }}
                      style={{ cursor: canEditProject ? "pointer" : "default" }}
                      title={canEditProject ? "Duplo clique para renomear" : ""}
                    >
                      {column.title}
                    </span>
                  )}
                  <div className="board-column-header-actions">
                    {SHOW_COLUMN_MANAGEMENT && canEditProject && columns.length > 1 ? (
                      <>
                        {column.position > 0 ? (
                          <button
                            className="text-button"
                            disabled={reorderColumnMutation.isPending}
                            onClick={() =>
                              void reorderColumnMutation.mutateAsync({
                                columnId: column.id,
                                targetPosition: column.position - 1,
                              })
                            }
                            title="Mover para esquerda"
                            type="button"
                          >
                            &larr;
                          </button>
                        ) : null}
                        {column.position < columns.length - 1 ? (
                          <button
                            className="text-button"
                            disabled={reorderColumnMutation.isPending}
                            onClick={() =>
                              void reorderColumnMutation.mutateAsync({
                                columnId: column.id,
                                targetPosition: column.position + 1,
                              })
                            }
                            title="Mover para direita"
                            type="button"
                          >
                            &rarr;
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    <span className="board-column-count">
                      {column.cards.length}
                    </span>
                    <button
                      className="text-button"
                      disabled={!canEditProject}
                      onClick={() => openCreateCardModal(column.id)}
                      type="button"
                    >
                      + Card
                    </button>
                    {canEditProject ? (
                      <button
                        className="text-button"
                        disabled={deleteColumnMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remover a coluna "${column.title}"? Cards ativos impedem a remocao.`,
                            )
                          ) {
                            void deleteColumnMutation.mutateAsync(column.id);
                          }
                        }}
                        style={{ color: "#8c2f25" }}
                        title="Remover coluna"
                        type="button"
                      >
                        x
                      </button>
                    ) : null}
                  </div>
                </div>

                {column.cards.length > 0 ? (
                  <>
                    <div
                      className={getDropZoneClassName(column.id, 0)}
                      onDragOver={(event) =>
                        handleDropTargetDragOver(event, column.id, 0)
                      }
                      onDrop={(event) => void handleDrop(event, column.id, 0)}
                    />
                    {column.cards.map((card, index) => (
                      <Fragment key={card.id}>
                        <button
                          className={
                            dragCard?.cardId === card.id
                              ? "task-card task-card-button task-card-dragging"
                              : "task-card task-card-button"
                          }
                          draggable={canEditProject}
                          onClick={() => openCardDetails(card.id)}
                          onDragEnd={handleDragEnd}
                          onDragStart={() =>
                            handleDragStart(card.id, column.id, index)
                          }
                          type="button"
                        >
                          <div className="badge-row">
                            <span
                              className={`badge ${getPriorityTone(card.priority)}`}
                            >
                              {formatPriority(card.priority)}
                            </span>
                            {canEditProject ? (
                              <span
                                aria-label="Renomear card"
                                className="task-card-rename"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  const next = window.prompt(
                                    "Novo nome do card:",
                                    card.title,
                                  );
                                  const trimmed = next?.trim();
                                  if (!trimmed || trimmed === card.title) return;
                                  void renameCardMutation.mutateAsync({
                                    cardId: card.id,
                                    title: trimmed,
                                    assigneeId: card.assignee?.id ?? "",
                                    priority: card.priority,
                                    description: card.description,
                                    dueDate: card.dueDate,
                                  });
                                }}
                                role="button"
                                title="Renomear card"
                              >
                                ✎
                              </span>
                            ) : null}
                          </div>
                          <h2 className="task-card-title">{card.title}</h2>
                          <div className="task-card-meta">
                            <span>
                              {card.assignee?.name ?? "Sem responsavel"}
                            </span>
                            <span className={getDueDateTone(card.dueDate)}>
                              {formatShortDate(card.dueDate)}
                            </span>
                          </div>
                        </button>
                        <div
                          className={getDropZoneClassName(column.id, index + 1)}
                          onDragOver={(event) =>
                            handleDropTargetDragOver(
                              event,
                              column.id,
                              index + 1,
                            )
                          }
                          onDrop={(event) =>
                            void handleDrop(event, column.id, index + 1)
                          }
                        />
                      </Fragment>
                    ))}
                  </>
                ) : (
                  <div
                    className={getDropZoneClassName(column.id, 0)}
                    onDragOver={(event) =>
                      handleDropTargetDragOver(event, column.id, 0)
                    }
                    onDrop={(event) => void handleDrop(event, column.id, 0)}
                  >
                    <div className="task-empty">
                      Nenhum card nesta coluna ainda. Use o botao acima para
                      cadastrar o primeiro.
                    </div>
                  </div>
                )}
              </article>
            ))}
          </section>
        ) : (
          <StatusState
            title="Board sem colunas"
            copy="Este projeto ainda nao possui as colunas fixas do MVP."
          />
        )
      ) : null}

      <Modal
        title="Nova coluna"
        description="Adicione uma nova coluna ao quadro Kanban."
        open={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
        footer={
          <>
            <button
              className="secondary-button"
              onClick={() => setIsAddColumnOpen(false)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={addColumnMutation.isPending || !newColumnTitle.trim()}
              onClick={() => void addColumnMutation.mutateAsync(newColumnTitle.trim())}
              type="button"
            >
              {addColumnMutation.isPending ? "Criando..." : "Criar coluna"}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label" htmlFor="new-column-title">
              Nome da coluna
            </label>
            <input
              autoFocus
              className="field-input"
              id="new-column-title"
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newColumnTitle.trim()) {
                  e.preventDefault();
                  void addColumnMutation.mutateAsync(newColumnTitle.trim());
                }
              }}
              type="text"
              value={newColumnTitle}
            />
          </div>
          {columnError ? <p className="form-error">{columnError}</p> : null}
        </div>
      </Modal>

      <Modal
        description="O card pode ser criado com titulo, responsavel e prioridade. O prazo agora e opcional."
        footer={
          <>
            <button
              className="secondary-button"
              onClick={() => setIsCreateModalOpen(false)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={createCardMutation.isPending}
              form="create-card-form"
              type="submit"
            >
              {createCardMutation.isPending ? "Salvando..." : "Criar card"}
            </button>
          </>
        }
        onClose={() => setIsCreateModalOpen(false)}
        open={isCreateModalOpen}
        title="Novo card"
      >
        <form
          className="form-grid"
          id="create-card-form"
          onSubmit={handleCreateCard}
        >
          <div className="field-group">
            <label className="field-label" htmlFor="create-card-title">
              Titulo
            </label>
            <input
              className="field-input"
              id="create-card-title"
              minLength={2}
              onChange={(event) =>
                setCreateCardForm((currentForm) => ({
                  ...currentForm,
                  title: event.target.value,
                }))
              }
              required
              type="text"
              value={createCardForm.title}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="create-card-description">
              Descricao
            </label>
            <textarea
              className="field-input field-textarea"
              id="create-card-description"
              onChange={(event) =>
                setCreateCardForm((currentForm) => ({
                  ...currentForm,
                  description: event.target.value,
                }))
              }
              rows={4}
              value={createCardForm.description}
            />
          </div>

          <div className="form-row form-row-3">
            <div className="field-group">
              <label className="field-label" htmlFor="create-card-column">
                Coluna
              </label>
              <select
                className="field-input"
                id="create-card-column"
                onChange={(event) =>
                  setCreateCardForm((currentForm) => ({
                    ...currentForm,
                    columnId: event.target.value,
                  }))
                }
                required
                value={createCardForm.columnId}
              >
                <option value="">Selecione</option>
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="create-card-assignee">
                Responsavel
              </label>
              <select
                className="field-input"
                id="create-card-assignee"
                onChange={(event) =>
                  setCreateCardForm((currentForm) => ({
                    ...currentForm,
                    assigneeId: event.target.value,
                  }))
                }
                required
                value={createCardForm.assigneeId}
              >
                <option value="">Selecione</option>
                {memberOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="create-card-priority">
                Prioridade
              </label>
              <select
                className="field-input"
                id="create-card-priority"
                onChange={(event) =>
                  setCreateCardForm((currentForm) => ({
                    ...currentForm,
                    priority: event.target.value as CardPriority,
                  }))
                }
                value={createCardForm.priority}
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {formatPriority(priority)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="create-card-due-date">
              Prazo (opcional)
            </label>
            <input
              className="field-input"
              id="create-card-due-date"
              onChange={(event) =>
                setCreateCardForm((currentForm) => ({
                  ...currentForm,
                  dueDate: event.target.value,
                }))
              }
              type="date"
              value={createCardForm.dueDate}
            />
          </div>

          {createError ? <p className="form-error">{createError}</p> : null}
        </form>
      </Modal>

      <Modal
        description="Detalhe completo do card com dados centrais, checklist e comentarios do MVP."
        footer={
          <>
            <button
              className="secondary-button"
              onClick={() => setSelectedCardId(null)}
              type="button"
            >
              Fechar
            </button>
            <button
              className="secondary-button button-danger"
              disabled={
                archiveCardMutation.isPending ||
                !cardQuery.data ||
                !canEditProject
              }
              onClick={() => void archiveCardMutation.mutateAsync()}
              type="button"
            >
              {archiveCardMutation.isPending ? "Arquivando..." : "Arquivar"}
            </button>
            <button
              className="primary-button"
              disabled={
                saveCardMutation.isPending || !cardQuery.data || !canEditProject
              }
              form="edit-card-form"
              type="submit"
            >
              {saveCardMutation.isPending ? "Salvando..." : "Salvar card"}
            </button>
          </>
        }
        onClose={() => setSelectedCardId(null)}
        open={Boolean(selectedCardId)}
        title={cardQuery.data?.title ?? "Detalhe do card"}
      >
        {cardQuery.isLoading ? (
          <StatusState
            tone="loading"
            title="Carregando card"
            copy="Estamos buscando os dados mais recentes deste card."
          />
        ) : null}

        {cardQuery.isError ? (
          <StatusState
            tone="error"
            title="Nao foi possivel carregar o card"
            copy={
              cardQuery.error instanceof Error
                ? cardQuery.error.message
                : "Tente novamente em instantes."
            }
          />
        ) : null}

        {cardQuery.data ? (
          <div className="card-detail-stack">
            <form
              className="form-grid"
              id="edit-card-form"
              onSubmit={handleSaveCard}
            >
              <div className="badge-row">
                <span className="badge badge-gray">
                  Coluna atual: {currentCardColumnName ?? "Sem coluna"}
                </span>
                <span
                  className={`badge ${getPriorityTone(cardQuery.data.priority)}`}
                >
                  {formatPriority(cardQuery.data.priority)}
                </span>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="edit-card-title">
                  Titulo
                </label>
                <input
                  className="field-input"
                  disabled={!canEditProject}
                  id="edit-card-title"
                  minLength={2}
                  onChange={(event) =>
                    setEditCardForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value,
                    }))
                  }
                  required
                  type="text"
                  value={editCardForm.title}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="edit-card-description">
                  Descricao
                </label>
                <textarea
                  className="field-input field-textarea"
                  disabled={!canEditProject}
                  id="edit-card-description"
                  onChange={(event) =>
                    setEditCardForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  value={editCardForm.description}
                />
              </div>

              <div className="form-row form-row-3">
                <div className="field-group">
                  <label className="field-label" htmlFor="edit-card-assignee">
                    Responsavel
                  </label>
                  <select
                    className="field-input"
                    disabled={!canEditProject}
                    id="edit-card-assignee"
                    onChange={(event) =>
                      setEditCardForm((currentForm) => ({
                        ...currentForm,
                        assigneeId: event.target.value,
                      }))
                    }
                    required
                    value={editCardForm.assigneeId}
                  >
                    <option value="">Selecione</option>
                    {memberOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="edit-card-priority">
                    Prioridade
                  </label>
                  <select
                    className="field-input"
                    disabled={!canEditProject}
                    id="edit-card-priority"
                    onChange={(event) =>
                      setEditCardForm((currentForm) => ({
                        ...currentForm,
                        priority: event.target.value as CardPriority,
                      }))
                    }
                    value={editCardForm.priority}
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {formatPriority(priority)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="edit-card-due-date">
                    Prazo (opcional)
                  </label>
                  <input
                    className="field-input"
                    disabled={!canEditProject}
                    id="edit-card-due-date"
                    onChange={(event) =>
                      setEditCardForm((currentForm) => ({
                        ...currentForm,
                        dueDate: event.target.value,
                      }))
                    }
                    type="date"
                    value={editCardForm.dueDate}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field-group">
                  <label className="field-label" htmlFor="edit-card-column">
                    Mover para
                  </label>
                  <select
                    className="field-input"
                    disabled={!canEditProject}
                    id="edit-card-column"
                    onChange={(event) =>
                      setEditCardForm((currentForm) => ({
                        ...currentForm,
                        targetColumnId: event.target.value,
                        targetPosition: 0,
                      }))
                    }
                    value={editCardForm.targetColumnId}
                  >
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="edit-card-position">
                    Posicao
                  </label>
                  <select
                    className="field-input"
                    disabled={!canEditProject}
                    id="edit-card-position"
                    onChange={(event) =>
                      setEditCardForm((currentForm) => ({
                        ...currentForm,
                        targetPosition: Number(event.target.value),
                      }))
                    }
                    value={editCardForm.targetPosition}
                  >
                    {positionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editError ? <p className="form-error">{editError}</p> : null}
            </form>

            <CardChecklistSection
              errorMessage={checklistErrorMessage}
              isBusy={
                createChecklistItemMutation.isPending ||
                updateChecklistItemMutation.isPending ||
                reorderChecklistItemMutation.isPending
              }
              isLoading={checklistQuery.isLoading}
              items={checklistItems}
              readOnly={!canEditProject}
              onCreate={(title) =>
                createChecklistItemMutation.mutateAsync(title)
              }
              onMove={handleChecklistMove}
              onRename={handleChecklistRename}
              onToggle={handleChecklistToggle}
            />

            <CardCommentsSection
              comments={commentsQuery.data ?? []}
              errorMessage={commentErrorMessage}
              isBusy={createCommentMutation.isPending}
              isLoading={commentsQuery.isLoading}
              readOnly={!canEditProject}
              onCreate={(content) => createCommentMutation.mutateAsync(content)}
            />
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}
