import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../app/auth-provider";
import { toDateInputValue } from "../app/formatters";
import { AppShell } from "../components/app-shell";
import { StatusState } from "../components/status-state";
import { ArchivedCardsModal } from "../features/board/archived-cards-modal";
import {
  BoardPageProvider,
  useBoardPageContext,
} from "../features/board/board-page-context";
import { BoardColumn as BoardColumnView } from "../features/board/board-column";
import {
  initialCreateCardForm,
  initialEditCardForm,
  priorityOptions,
  SHOW_COLUMN_MANAGEMENT,
  type CreateCardFormState,
  type EditCardFormState,
} from "../features/board/board-form-state";
import { isCompletedColumnTitle } from "../features/board/board-utils";
import { CardDetailModal } from "../features/board/card-detail-modal";
import { CreateCardModal } from "../features/board/create-card-modal";
import { NewColumnModal } from "../features/board/new-column-modal";
import { useBoardCardActions } from "../features/board/use-board-card-actions";
import { useBoardCardDrag } from "../features/board/use-board-card-drag";
import { useBoardChecklistActions } from "../features/board/use-board-checklist-actions";
import { useBoardColumnActions } from "../features/board/use-board-column-actions";
import { useBoardColumnScroll } from "../features/board/use-board-column-scroll";
import { useBoardDescriptionActions } from "../features/board/use-board-description-actions";
import { useProjectBoardData } from "../features/board/use-project-board-data";

export function ProjectBoardPage() {
  const { token, user } = useAuth();
  const { projectId = "" } = useParams();

  return (
    <BoardPageProvider projectId={projectId} token={token} user={user}>
      <ProjectBoardPageContent />
    </BoardPageProvider>
  );
}

function ProjectBoardPageContent() {
  const { projectId, token, user } = useBoardPageContext();
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
  const [boardActionError, setBoardActionError] = useState<string | null>(null);

  const {
    archivedCardsQuery,
    boardQuery,
    canEditProject,
    cardQuery,
    checklistQuery,
    columns,
    commentsQuery,
    isReadOnlyProject,
    memberOptions,
    projectQuery,
  } = useProjectBoardData({
    isArchivedModalOpen,
    projectId,
    selectedCardId,
    token,
    user,
  });

  const {
    addColumnMutation,
    columnError,
    deleteColumnMutation,
    editingColumnId,
    editingColumnTitle,
    handleDeleteColumn,
    handleRenameColumn,
    handleStartEditingColumn,
    isAddColumnOpen,
    newColumnTitle,
    reorderColumnMutation,
    setColumnError,
    setEditingColumnId,
    setEditingColumnTitle,
    setIsAddColumnOpen,
    setNewColumnTitle,
  } = useBoardColumnActions({
    boardId: boardQuery.data?.id,
  });
  const {
    getColumnScrollClassNames,
    handleColumnScroll,
    handleColumnWheel,
    registerColumnBody,
    showColumnScrollLimit,
  } = useBoardColumnScroll(columns);
  const {
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
  } = useBoardChecklistActions({ selectedCardId });
  const {
    createCardDescriptionMutation,
    deleteCardDescriptionMutation,
    descriptionError,
    setDescriptionError,
    updateCardDescriptionMutation,
  } = useBoardDescriptionActions({ selectedCardId });
  const {
    archiveCardMutation,
    createCardMutation,
    dragMoveCardMutation,
    handleCreateCard,
    handleRenameCard,
    handleSaveCard,
    restoreCardMutation,
    saveCardMutation,
  } = useBoardCardActions({
    createCardForm,
    editCardForm,
    selectedCardId,
    setBoardActionError,
    setCreateCardForm,
    setCreateError,
    setEditError,
    setIsCreateModalOpen,
    setSelectedCardId,
  });
  const {
    dragCardId,
    getColumnBodyClassName,
    getDropZoneClassName,
    handleColumnDragOver,
    handleColumnDrop,
    handleDragEnd,
    handleDragStart,
    handleDrop,
    handleDropTargetDragOver,
    isDraggingCard,
  } = useBoardCardDrag({
    canEditProject,
    getColumnScrollClassNames,
    isMovePending: dragMoveCardMutation.isPending,
    onMoveCard: (payload) => dragMoveCardMutation.mutateAsync(payload),
    onStartDrag: () => setBoardActionError(null),
    showColumnScrollLimit,
  });

  useEffect(() => {
    if (!cardQuery.data) {
      return;
    }

    const assigneeId =
      cardQuery.data.assignee?.id ?? memberOptions[0]?.id ?? "";

    setEditCardForm({
      assigneeId,
      dueDate: toDateInputValue(cardQuery.data.dueDate),
      priority: cardQuery.data.priority,
      title: cardQuery.data.title,
    });
    setEditError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardQuery.data?.id]);

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
    if (isDraggingCard) {
      return;
    }

    setBoardActionError(null);
    setEditError(null);
    setChecklistError(null);
    setDescriptionError(null);
    setSelectedCardId(cardId);
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
  const isColumnActionPending =
    deleteColumnMutation.isPending || reorderColumnMutation.isPending;

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
                dragCardId={dragCardId}
                editingColumnId={editingColumnId}
                editingColumnTitle={editingColumnTitle}
                getColumnBodyClassName={getColumnBodyClassName}
                getDropZoneClassName={getDropZoneClassName}
                isColumnActionPending={isColumnActionPending}
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
