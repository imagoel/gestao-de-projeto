import { useCallback, useEffect, useRef, useState, type UIEvent } from 'react';

type ProjectRowHint = {
  left: boolean;
  right: boolean;
};

export function useProjectRowScroll(refreshSignal: unknown) {
  const [projectRowHints, setProjectRowHints] = useState<Record<string, ProjectRowHint>>(
    {},
  );
  const projectRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const updateProjectRowHints = useCallback(
    (element: HTMLDivElement, folderId: string) => {
      const hasScrollableContent = element.scrollWidth > element.clientWidth + 1;
      const nextHints = {
        left: hasScrollableContent && element.scrollLeft > 1,
        right:
          hasScrollableContent &&
          element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      };

      setProjectRowHints((current) => {
        const currentHints = current[folderId];

        if (
          currentHints?.left === nextHints.left &&
          currentHints?.right === nextHints.right
        ) {
          return current;
        }

        return {
          ...current,
          [folderId]: nextHints,
        };
      });
    },
    [],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      projectRowRefs.current.forEach((element, folderId) => {
        updateProjectRowHints(element, folderId);
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [refreshSignal, updateProjectRowHints]);

  useEffect(() => {
    return () => {
      projectRowRefs.current.clear();
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      projectRowRefs.current.forEach((element, folderId) => {
        updateProjectRowHints(element, folderId);
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateProjectRowHints]);

  function handleProjectRowScroll(event: UIEvent<HTMLDivElement>, folderId: string) {
    updateProjectRowHints(event.currentTarget, folderId);
  }

  function registerProjectRow(folderId: string, element: HTMLDivElement | null) {
    if (!element) {
      projectRowRefs.current.delete(folderId);
      return;
    }

    projectRowRefs.current.set(folderId, element);
    window.requestAnimationFrame(() => updateProjectRowHints(element, folderId));
  }

  function getProjectRowShellClassName(folderId: string) {
    const classNames = ['project-row-shell'];
    const hints = projectRowHints[folderId];

    if (hints?.left) {
      classNames.push('project-row-has-more-left');
    }

    if (hints?.right) {
      classNames.push('project-row-has-more-right');
    }

    return classNames.join(' ');
  }

  return {
    getProjectRowShellClassName,
    handleProjectRowScroll,
    registerProjectRow,
  };
}
