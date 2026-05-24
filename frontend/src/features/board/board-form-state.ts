import type { CardPriority } from "../../types/api";

export type CreateCardFormState = {
  assigneeId: string;
  columnId: string;
  dueDate: string;
  priority: CardPriority;
  title: string;
};

export type EditCardFormState = {
  assigneeId: string;
  dueDate: string;
  priority: CardPriority;
  title: string;
};

export const initialCreateCardForm: CreateCardFormState = {
  assigneeId: "",
  columnId: "",
  dueDate: "",
  priority: "MEDIUM",
  title: "",
};

export const initialEditCardForm: EditCardFormState = {
  assigneeId: "",
  dueDate: "",
  priority: "MEDIUM",
  title: "",
};

export const priorityOptions: CardPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

// Column management UI (reorder arrows + add new column) is hidden for the MVP.
export const SHOW_COLUMN_MANAGEMENT = false;
