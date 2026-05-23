import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type UIEvent,
  type WheelEvent,
} from "react";

import type { BoardColumn } from "../../types/api";

type ScrollEdge = "top" | "bottom";

export function useBoardColumnScroll(columns: BoardColumn[]) {
  const [scrollLimitFeedback, setScrollLimitFeedback] = useState<{
    columnId: string;
    edge: ScrollEdge;
  } | null>(null);
  const [columnScrollHints, setColumnScrollHints] = useState<Record<string, boolean>>(
    {},
  );
  const columnBodyRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollLimitFeedbackTimeout = useRef<number | null>(null);

  const updateColumnScrollHint = useCallback(
    (element: HTMLDivElement, columnId: string) => {
      const hasScrollableContent = element.scrollHeight > element.clientHeight + 1;
      const hasMoreBelow =
        hasScrollableContent &&
        element.scrollTop + element.clientHeight < element.scrollHeight - 1;

      setColumnScrollHints((current) => {
        if (current[columnId] === hasMoreBelow) {
          return current;
        }

        return {
          ...current,
          [columnId]: hasMoreBelow,
        };
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (scrollLimitFeedbackTimeout.current) {
        window.clearTimeout(scrollLimitFeedbackTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      columnBodyRefs.current.forEach((element, columnId) => {
        updateColumnScrollHint(element, columnId);
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [columns, updateColumnScrollHint]);

  function registerColumnBody(columnId: string, element: HTMLDivElement | null) {
    if (!element) {
      columnBodyRefs.current.delete(columnId);
      return;
    }

    columnBodyRefs.current.set(columnId, element);
    window.requestAnimationFrame(() => updateColumnScrollHint(element, columnId));
  }

  function showColumnScrollLimit(columnId: string, edge: ScrollEdge) {
    setScrollLimitFeedback({ columnId, edge });

    if (scrollLimitFeedbackTimeout.current) {
      window.clearTimeout(scrollLimitFeedbackTimeout.current);
    }

    scrollLimitFeedbackTimeout.current = window.setTimeout(() => {
      setScrollLimitFeedback((current) =>
        current?.columnId === columnId && current.edge === edge ? null : current,
      );
    }, 420);
  }

  function handleColumnWheel(event: WheelEvent<HTMLDivElement>, columnId: string) {
    const element = event.currentTarget;
    const hasScrollableContent = element.scrollHeight > element.clientHeight + 1;

    if (!hasScrollableContent) {
      return;
    }

    const isAtTop = element.scrollTop <= 0;
    const isAtBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 1;

    if (event.deltaY < 0 && isAtTop) {
      event.preventDefault();
      showColumnScrollLimit(columnId, "top");
    }

    if (event.deltaY > 0 && isAtBottom) {
      event.preventDefault();
      showColumnScrollLimit(columnId, "bottom");
    }
  }

  function handleColumnScroll(event: UIEvent<HTMLDivElement>, columnId: string) {
    updateColumnScrollHint(event.currentTarget, columnId);
  }

  function getColumnScrollClassNames(columnId: string) {
    const classNames: string[] = [];

    if (scrollLimitFeedback?.columnId === columnId) {
      classNames.push(`board-column-scroll-limit-${scrollLimitFeedback.edge}`);
    }

    if (columnScrollHints[columnId]) {
      classNames.push("board-column-has-more-bottom");
    }

    return classNames;
  }

  return {
    getColumnScrollClassNames,
    handleColumnScroll,
    handleColumnWheel,
    registerColumnBody,
    showColumnScrollLimit,
  };
}

