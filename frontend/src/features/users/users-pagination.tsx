type UsersPaginationProps = {
  currentPage: number;
  pageCount: number;
  pageSize: number;
  totalUsers: number;
  onNextPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
  onPreviousPage: () => void;
};

export function UsersPagination({
  currentPage,
  pageCount,
  pageSize,
  totalUsers,
  onNextPage,
  onPageSizeChange,
  onPreviousPage,
}: UsersPaginationProps) {
  return (
    <div className="pagination-row">
      <span className="muted-text">
        {totalUsers} usuario{totalUsers === 1 ? '' : 's'}
      </span>
      <div className="pagination-actions">
        <label className="pagination-size">
          <span>Por pagina</span>
          <select
            className="field-input"
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pageSize}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
        <button
          className="secondary-button"
          disabled={currentPage <= 1}
          onClick={onPreviousPage}
          type="button"
        >
          Anterior
        </button>
        <span className="muted-text">
          {currentPage} / {pageCount}
        </span>
        <button
          className="secondary-button"
          disabled={currentPage >= pageCount}
          onClick={onNextPage}
          type="button"
        >
          Proxima
        </button>
      </div>
    </div>
  );
}
