import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react";

import type { ApiUser } from "../../types/api";

type BoardPageContextValue = {
  projectId: string;
  token: string | null;
  user: ApiUser | null;
};

const BoardPageContext = createContext<BoardPageContextValue | null>(null);

export function BoardPageProvider({
  children,
  projectId,
  token,
  user,
}: PropsWithChildren<BoardPageContextValue>) {
  return (
    <BoardPageContext.Provider value={{ projectId, token, user }}>
      {children}
    </BoardPageContext.Provider>
  );
}

export function useBoardPageContext() {
  const context = useContext(BoardPageContext);

  if (!context) {
    throw new Error(
      "useBoardPageContext deve ser usado dentro de BoardPageProvider.",
    );
  }

  return context;
}
