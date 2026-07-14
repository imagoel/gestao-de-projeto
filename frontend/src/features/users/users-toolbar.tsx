import type { Secretariat } from '../../types/api';
import type { AvailableSector, RoleFilter, StatusFilter } from './users-types';

type UsersToolbarProps = {
  availableSectors: AvailableSector[];
  onRoleFilterChange: (value: RoleFilter) => void;
  onSearchChange: (value: string) => void;
  onSecretariatFilterChange: (value: string) => void;
  onSectorFilterChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  roleFilter: RoleFilter;
  search: string;
  secretariatFilter: string;
  secretariats: Secretariat[];
  sectorFilter: string;
  statusFilter: StatusFilter;
};

export function UsersToolbar({
  availableSectors,
  onRoleFilterChange,
  onSearchChange,
  onSecretariatFilterChange,
  onSectorFilterChange,
  onStatusFilterChange,
  roleFilter,
  search,
  secretariatFilter,
  secretariats,
  sectorFilter,
  statusFilter,
}: UsersToolbarProps) {
  const filteredSectors = availableSectors.filter(
    (sector) => secretariatFilter === 'ALL' || sector.secretariat.id === secretariatFilter,
  );

  return (
    <div className="users-toolbar">
      <div className="field-group users-search">
        <label className="field-label" htmlFor="users-search">
          Buscar
        </label>
        <input
          className="field-input"
          id="users-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Nome ou usuario"
          type="search"
          value={search}
        />
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="users-role-filter">
          Perfil
        </label>
        <select
          className="field-input"
          id="users-role-filter"
          onChange={(event) => onRoleFilterChange(event.target.value as RoleFilter)}
          value={roleFilter}
        >
          <option value="ALL">Todos</option>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Membro</option>
        </select>
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="users-status-filter">
          Status
        </label>
        <select
          className="field-input"
          id="users-status-filter"
          onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
          value={statusFilter}
        >
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
        </select>
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="users-secretariat-filter">
          Secretaria
        </label>
        <select
          className="field-input"
          id="users-secretariat-filter"
          onChange={(event) => onSecretariatFilterChange(event.target.value)}
          value={secretariatFilter}
        >
          <option value="ALL">Todas</option>
          {secretariats.map((secretariat) => (
            <option key={secretariat.id} value={secretariat.id}>
              {secretariat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="users-sector-filter">
          Setor
        </label>
        <select
          className="field-input"
          id="users-sector-filter"
          onChange={(event) => onSectorFilterChange(event.target.value)}
          value={sectorFilter}
        >
          <option value="ALL">Todos</option>
          {filteredSectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {`${sector.secretariat.name} > ${sector.name}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
