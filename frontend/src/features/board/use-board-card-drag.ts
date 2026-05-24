import { useState, type DragEvent } from "react";

import type { BoardColumn } from "../../types/api";

type DragCardState = {
  cardId: string;
  sourceColumnId: string;
  sourcePosition: number;
};

type MoveCardPayload = {
  cardId: string;
  targetColumnId: string;
  targetPosition: number;
};

type UseBoardCardDragParams = {
  canEditProject: boolean;
  getColumnScrollClassNames: (columnId: string) => string[];
  isMovePending: boolean;
  onMoveCard: (payload: MoveCardPayload) => Promise<unknown>;
  onStartDrag?: () => void;
  showColumnScrollLimit: (columnId: string, edge: "top" | "bottom") => void;
};

export function useBoardCardDrag({
  canEditProject,
  getColumnScrollClassNames,
  isMovePending,
  onMoveCard,
  onStartDrag,
  showColumnScrollLimit,
}: UseBoardCardDragParams) {
  const [dragCard, setDragCard] = useState<DragCardState | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    columnId: string;
    position: number;
  } | null>(null);

  function handleDragStart(
    cardId: string,
    sourceColumnId: string,
    sourcePosition: number,
  ) {
    if (!canEditProject) {
      return;
    }

    onStartDrag?.();
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
    if (!dragCard || !canEditProject || isMovePending) {
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

  function handleColumnDragOver(
    event: DragEvent<HTMLDivElement>,
    column: BoardColumn,
  ) {
    if (!dragCard || !canEditProject || isMovePending) {
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

    if (!dragCard || isMovePending) {
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

    try {
      await onMoveCard({
        cardId: dragCard.cardId,
        targetColumnId: columnId,
        targetPosition: position,
      });
    } catch {
      // The mutation owns the user-facing error. Keep the drag state cleanup here.
    } finally {
      setDragCard(null);
      setDropTarget(null);
    }
  }

  async function handleColumnDrop(
    event: DragEvent<HTMLDivElement>,
    column: BoardColumn,
  ) {
    if (!dragCard || isMovePending) {
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

  return {
    dragCardId: dragCard?.cardId ?? null,
    getColumnBodyClassName,
    getDropZoneClassName,
    handleColumnDragOver,
    handleColumnDrop,
    handleDragEnd,
    handleDragStart,
    handleDrop,
    handleDropTargetDragOver,
    isDraggingCard: Boolean(dragCard),
  };
}
