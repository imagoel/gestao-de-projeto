import type { BoardColumn, CardPriority } from "../../types/api";

const PRIORITY_WEIGHT: Record<CardPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function isCompletedColumnTitle(title: string) {
  return (
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() === "concluido"
  );
}

export function sortColumnCards(columns: BoardColumn[]) {
  return columns.map((column) => ({
    ...column,
    cards: [...column.cards].sort((firstCard, secondCard) => {
      const priorityDifference =
        PRIORITY_WEIGHT[firstCard.priority] - PRIORITY_WEIGHT[secondCard.priority];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return firstCard.position - secondCard.position;
    }),
  }));
}

