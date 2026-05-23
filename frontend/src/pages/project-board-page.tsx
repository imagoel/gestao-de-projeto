import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../app/auth-provider";
import { toDateInputValue } from "../app/formatters";
import { AppShell } from "../components/app-shell";
import { StatusState } from "../components/status-state";
import { ArchivedCardsModal } from "../features/board/archived-cards-modal";
import { BoardColumn as BoardColumnView } from "../features/board/board-column";
import {
  isCompletedColumnTitle,
  sortColumnCards,
} from "../features/board/board-utils";
import { CardDetailModal } from "../features/board/card-detail-modal";
import { CreateCardModal } from "../features/board/create-card-modal";
import { NewColumnModal } from "../features/board/new-column-modal";
import { useBoardColumnScroll } from "../features/board/use-board-column-scroll";
import { ApiError, api } from "../services/api";
import type { BoardCard, BoardColumn, CardPriority, ChecklistItem } from "../types/api";

type CreateCardFormState = {
  assigneeId: string;
  columnId: string;
  dueDate: string;
  priority: CardPriority;
  title: string;
};

type EditCardFormState = {
  assigneeId: string;
  dueDate: string;
  priority: CardPriority;
  title: string;
};

const initialCreateCardForm: CreateCardFormState = {
  assigneeId: "",
  columnId: "",
  dueDate: "",
  priority: "MEDIUM",
  title: "",
};

const initialEditCardForm: EditCardFormState = {
  assigneeId: "",
  dueDate: "",
  priority: "MEDIUM",
  title: "",
};

const priorityOptions: CardPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Feature flag: column management UI (reorder arrows + add new column).
// Hidden for the current MVP; toggle to re-enable in the future.
const SHOW_COLUMN_MANAGEMENT = false;

type DragCardState = {
  cardId: string;
  sourceColumnId: string;
  sourcePosition: number;
};

export function ProjectBoardPage() {
  const queryClient = useQueryClient();
  const { token, user } = useAuth();
  const { projectId = "" } = useParams();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [createCardForm, setCreateCardForm] = useState<CreateCardFormState>(
    initialCreateCardForm,
  );
  const [editCardForm, setEditCardForm] =
    useState<EditCardFormState>(initialEditCardForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
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

  const archivedCardsQuery = useQuery({
    queryKey: ["archived-cards", projectId],
    queryFn: () => api.getArchivedCards(token!, projectId),
    enabled: Boolean(token && projectId && isArchivedModalOpen),
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
    queryKey: ["card-comments", selectedCardId],
    queryFn: () => api.getCardComments(token!, selectedCardId!),
    enabled: Boolean(token && selectedCardId),
  });

  const memberOptions =
    projectQuery.data?.members
      .filter((member) => member.role !== "VIEWER")
      .map((member) => member.user) ?? [];
  const columns = useMemo(() => {
    const rawColumns = boardQuery.data?.columns ?? [];
    return sortColumnCards(rawColumns);
  }, [boardQuery.data?.columns]);
  const {
    getColumnScrollClassNames,
    handleColumnScroll,
    handleColumnWheel,
    registerColumnBody,
    showColumnScrollLimit,
  } = useBoardColumnScroll(columns);
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
        dueDate: toDateInputValue(cardQuery.data.dueDate),
        priority: cardQuery.data.priority,
        title: cardQuery.data.title,
      });
    } else {
      setEditCardForm({
        assigneeId,
        dueDate: toDateInputValue(cardQuery.data.dueDate),
        priority: cardQuery.data.priority,
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
    setDescriptionError(null);
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
  const canCreateCard =
    canEditProject && columns.length > 0 && memberOptions.length > 0;
  const currentCardColumnName = columns.find(
    (column) => column.id === cardQuery.data?.columnId,
  )?.title;
  const checklistItems = checklistQuery.data ?? [];
  const checklistReferences = checklistItems.map((item, index) => ({
    done: item.done,
    id: item.id,
    number: index + 1,
    title: item.title,
  }));
  const checklistErrorMessage =
    checklistError ??
    (checklistQuery.error instanceof Error
      ? checklistQuery.error.message
      : null);
  const cardDescriptions = commentsQuery.data ?? [];
  const cardDescriptionErrorMessage =
    descriptionError ??
    (commentsQuery.error instanceof Error
      ? commentsQuery.error.message
      : null);
  const archivedCards = archivedCardsQuery.data ?? [];
  const archivedCardsErrorMessage =
    archivedCardsQuery.error instanceof Error
      ? archivedCardsQuery.error.message
      : null;

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

  function getDropPositionFromPointer(
    event: DragEvent<HTMLElement>,
    column: BoardColumn,
  ) {
    const currentTarget = event.currentTarget;
    const visibleCards = column.cards.filter((card) => card.id !== dragCard?.cardId);
    const cardElements = Array.from(
      currentTarget.querySelectorAll<HTMLElement>("[data-board-card-id]"),
    ).filter((element) => element.dataset.boardCardId !== dragCard?.cardId);

    if (visibleCards.length === 0 || cardElements.length === 0) {
      return 0;
    }

    const targetIndex = cardElements.findIndex((element) => {
      const bounds = element.getBoundingClientRect();
      return event.clientY < bounds.top + bounds.height / 2;
    });

    return targetIndex === -1 ? visibleCards.length : targetIndex;
  }

  function handleColumnDragOver(event: DragEvent<HTMLDivElement>, column: BoardColumn) {
    if (!dragCard || !canEditProject || dragMoveCardMutation.isPending) {
      return;
    }

    event.preventDefault();

    const element = event.currentTarget;
    const hasScrollableContent = element.scrollHeight > element.clientHeight + 1;
    const isAtBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
    const isNearBottom =
      event.clientY >= element.getBoundingClientRect().bottom - 28;

    if (hasScrollableContent && isAtBottom && isNearBottom) {
      showColumnScrollLimit(column.id, "bottom");
    }

    const nextPosition = getDropPositionFromPointer(event, column);
    if (
      dropTarget?.columnId !== column.id ||
      dropTarget.position !== nextPosition
    ) {
      setDropTarget({ columnId: column.id, position: nextPosition });
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

  async function handleColumnDrop(
    event: DragEvent<HTMLDivElement>,
    column: BoardColumn,
  ) {
    if (!dragCard || dragMoveCardMutation.isPending) {
      return;
    }

    const nextPosition = getDropPositionFromPointer(event, column);
    await handleDrop(event, column.id, nextPosition);
  }

  function getDropZoneClassName(columnId: string, position: number) {
    const classNames = ["board-drop-zone"];

    if (position === 0) {
      classNames.push("board-drop-zone-top");
    }

    if (dropTarget?.columnId === columnId && dropTarget.position === position) {
      classNames.push("board-drop-zone-active");
    }

    return classNames.join(" ");
  }

  function getColumnBodyClassName(columnId: string) {
    const classNames = ["board-column-body"];

    if (dropTarget?.columnId === columnId) {
      classNames.push("board-column-body-active");
    }

    classNames.push(...getColumnScrollClassNames(columnId));

    return classNames.join(" ");
  }

  function handleStartEditingColumn(column: BoardColumn) {
    setEditingColumnId(column.id);
    setEditingColumnTitle(column.title);
  }

  function handleRenameColumn(columnId: string, title: string) {
    void renameColumnMutation.mutateAsync({ columnId, title });
  }

  function handleDeleteColumn(column: BoardColumn) {
    if (
      window.confirm(
        `Remover a coluna "${column.title}"? Cards ativos impedem a remocao.`,
      )
    ) {
      void deleteColumnMutation.mutateAsync(column.id);
    }
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
          <button
            className="secondary-button"
            onClick={() => setIsArchivedModalOpen(true)}
            type="button"
          >
            Arquivados
          </button>
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
              <BoardColumnView
                canEditProject={canEditProject}
                column={column}
                columnCount={columns.length}
                dragCardId={dragCard?.cardId}
                editingColumnId={editingColumnId}
                editingColumnTitle={editingColumnTitle}
                getColumnBodyClassName={getColumnBodyClassName}
                getDropZoneClassName={getDropZoneClassName}
                isColumnActionPending={
                  deleteColumnMutation.isPending ||
                  reorderColumnMutation.isPending
                }
                isCompletedColumn={isCompletedColumnTitle(column.title)}
                key={column.id}
                registerColumnBody={registerColumnBody}
                showColumnManagement={SHOW_COLUMN_MANAGEMENT}
                onCancelEditingColumn={() => setEditingColumnId(null)}
                onCardDragEnd={handleDragEnd}
                onChangeEditingColumnTitle={setEditingColumnTitle}
                onColumnDragOver={handleColumnDragOver}
                onColumnDrop={handleColumnDrop}
                onColumnScroll={handleColumnScroll}
                onColumnWheel={handleColumnWheel}
                onDeleteColumn={handleDeleteColumn}
                onDrop={handleDrop}
                onDropZoneDragOver={handleDropTargetDragOver}
                onOpenCard={openCardDetails}
                onOpenCreateCard={openCreateCardModal}
                onRenameCard={handleRenameCard}
                onRenameColumn={handleRenameColumn}
                onReorderColumn={(columnId, targetPosition) =>
                  void reorderColumnMutation.mutateAsync({
                    columnId,
                    targetPosition,
                  })
                }
                onStartCardDrag={handleDragStart}
                onStartEditingColumn={handleStartEditingColumn}
              />
            ))}
          </section>
        ) : (
          <StatusState
            title="Board sem colunas"
            copy="Este projeto ainda nao possui as colunas fixas do MVP."
          />
        )
      ) : null}

      <NewColumnModal
        errorMessage={columnError}
        isCreating={addColumnMutation.isPending}
        onChangeTitle={setNewColumnTitle}
        onClose={() => setIsAddColumnOpen(false)}
        onCreate={(title) => void addColumnMutation.mutateAsync(title)}
        open={isAddColumnOpen}
        title={newColumnTitle}
      />

      <ArchivedCardsModal
        canEditProject={canEditProject}
        cards={archivedCards}
        errorMessage={archivedCardsErrorMessage}
        isLoading={archivedCardsQuery.isLoading}
        isRestoring={restoreCardMutation.isPending}
        onClose={() => setIsArchivedModalOpen(false)}
        onRestore={(cardId) => void restoreCardMutation.mutateAsync(cardId)}
        open={isArchivedModalOpen}
      />

      <CreateCardModal
        columns={columns}
        errorMessage={createError}
        form={createCardForm}
        isSaving={createCardMutation.isPending}
        memberOptions={memberOptions}
        onChangeForm={setCreateCardForm}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCard}
        open={isCreateModalOpen}
        priorityOptions={priorityOptions}
      />

      <CardDetailModal
        canEditProject={canEditProject}
        card={cardQuery.data}
        cardDescriptionErrorMessage={cardDescriptionErrorMessage}
        cardDescriptions={cardDescriptions}
        checklistErrorMessage={checklistErrorMessage}
        checklistItems={checklistItems}
        checklistReferences={checklistReferences}
        currentCardColumnName={currentCardColumnName}
        editError={editError}
        form={editCardForm}
        isArchivePending={archiveCardMutation.isPending}
        isChecklistBusy={
          createChecklistItemMutation.isPending ||
          updateChecklistItemMutation.isPending ||
          reorderChecklistItemMutation.isPending ||
          deleteChecklistItemMutation.isPending
        }
        isChecklistLoading={checklistQuery.isLoading}
        isCommentsBusy={
          createCardDescriptionMutation.isPending ||
          updateCardDescriptionMutation.isPending ||
          deleteCardDescriptionMutation.isPending
        }
        isCommentsLoading={commentsQuery.isLoading}
        isLoading={cardQuery.isLoading}
        isOpen={Boolean(selectedCardId)}
        isSavePending={saveCardMutation.isPending}
        loadErrorMessage={
          cardQuery.isError
            ? cardQuery.error instanceof Error
              ? cardQuery.error.message
              : "Tente novamente em instantes."
            : null
        }
        memberOptions={memberOptions}
        onArchive={() => void archiveCardMutation.mutateAsync()}
        onChangeForm={setEditCardForm}
        onChecklistCreate={(title) =>
          createChecklistItemMutation.mutateAsync(title)
        }
        onChecklistDelete={handleChecklistDelete}
        onChecklistMove={handleChecklistMove}
        onChecklistRename={handleChecklistRename}
        onChecklistToggle={handleChecklistToggle}
        onClose={() => setSelectedCardId(null)}
        onCommentCreate={(content) =>
          createCardDescriptionMutation.mutateAsync(content)
        }
        onCommentDelete={(commentId) =>
          deleteCardDescriptionMutation.mutateAsync(commentId)
        }
        onCommentReferenceClick={handleChecklistReferenceClick}
        onCommentUpdate={(commentId, content) =>
          updateCardDescriptionMutation.mutateAsync({ commentId, content })
        }
        onSubmit={handleSaveCard}
        priorityOptions={priorityOptions}
      />
    </AppShell>
  );
}
