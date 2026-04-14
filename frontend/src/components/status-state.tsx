import type { ReactNode } from 'react';

type StatusStateProps = {
  title: string;
  copy: string;
  tone?: 'loading' | 'empty' | 'error';
  action?: ReactNode;
};

export function StatusState({
  title,
  copy,
  tone = 'empty',
  action,
}: StatusStateProps) {
  return (
    <div className={`status-state status-state-${tone}`}>
      <div className="status-state-mark" aria-hidden="true" />
      <div className="status-state-content">
        <h2 className="status-state-title">{title}</h2>
        <p className="status-state-copy">{copy}</p>
      </div>
      {action ? <div className="status-state-action">{action}</div> : null}
    </div>
  );
}
