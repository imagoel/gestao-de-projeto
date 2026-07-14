import type { ApiUser } from '../../types/api';
import { getMembershipLabel } from './users-utils';

type UsersTableProps = {
  onEditUser: (user: ApiUser) => void;
  users: ApiUser[];
};

export function UsersTable({ onEditUser, users }: UsersTableProps) {
  return (
    <div className="users-table-wrap">
      <table className="users-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Usuario</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Vinculos</th>
            <th aria-label="Acoes" />
          </tr>
        </thead>
        <tbody>
          {users.length > 0 ? (
            users.map((listedUser) => {
              const memberships = listedUser.sectorMemberships ?? [];
              const visibleMemberships = memberships.slice(0, 3);
              const hiddenCount = memberships.length - visibleMemberships.length;

              return (
                <tr
                  className={!listedUser.isActive ? 'users-table-row-muted' : undefined}
                  key={listedUser.email}
                >
                  <td>{listedUser.name}</td>
                  <td>{listedUser.email}</td>
                  <td>
                    <span
                      className={`badge ${
                        listedUser.role === 'ADMIN' ? 'badge-blue' : 'badge-gray'
                      }`}
                    >
                      {listedUser.role === 'ADMIN' ? 'Admin' : 'Membro'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        listedUser.isActive ? 'badge-green' : 'badge-red'
                      }`}
                    >
                      {listedUser.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="badge-row">
                      {visibleMemberships.length > 0 ? (
                        <>
                          {visibleMemberships.map((membership) => (
                            <span className="badge badge-gray" key={membership.id}>
                              {getMembershipLabel(membership)}
                            </span>
                          ))}
                          {hiddenCount > 0 ? (
                            <span className="badge badge-gray">+{hiddenCount}</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="muted-text">Sem vinculo</span>
                      )}
                    </div>
                  </td>
                  <td className="users-table-actions">
                    <button
                      className="secondary-button"
                      onClick={() => onEditUser(listedUser)}
                      type="button"
                    >
                      Editar acessos
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6}>
                <span className="muted-text">
                  Nenhum usuario encontrado com os filtros atuais.
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
