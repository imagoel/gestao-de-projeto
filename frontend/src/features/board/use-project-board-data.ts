import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../services/api";
import type { ApiUser } from "../../types/api";
import { sortColumnCards } from "./board-utils";

type UseProjectBoardDataParams = {
  isArchivedModalOpen: boolean;
  projectId: string;
  selectedCardId: string | null;
  token?: string | null;
  user?: ApiUser | null;
};

export function useProjectBoardData({
  isArchivedModalOpen,
  projectId,
  selectedCardId,
  token,
  user,
}: UseProjectBoardDataParams) {
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

  return {
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
  };
}
