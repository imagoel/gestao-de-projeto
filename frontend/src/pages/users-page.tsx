import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../app/auth-provider';
import { AppShell } from '../components/app-shell';
import { Modal } from '../components/modal';
import { StatusState } from '../components/status-state';
import { ApiError, api } from '../services/api';
import type { ApiUser, UserRole } from '../types/api';

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl: string;
  sectorIds: string[];
};

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type RoleFilter = 'ALL' | UserRole;

const initialUserForm: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'MEMBER',
  isActive: true,
  avatarUrl: '',
  sectorIds: [],
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getMembershipLabel(membership: NonNullable<ApiUser['sectorMemberships']>[number]) {
  return `${membership.sector.secretariat.name} > ${membership.sector.name}`;
}

export function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { syncUser, token, user } = useAuth();
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOrganizationOpen, setIsOrganizationOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(initialUserForm);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [secretariatFilter, setSecretariatFilter] = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [newSecretariatName, setNewSecretariatName] = useState('');
  const [newSectorForm, setNewSectorForm] = useState({
    name: '',
    secretariatId: '',
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(token!),
    enabled: Boolean(token),
  });

  const secretariatsQuery = useQuery({
    queryKey: ['secretariats'],
    queryFn: () => api.getSecretariats(token!),
    enabled: Boolean(token),
  });

  const secretariats = secretariatsQuery.data ?? [];
  const availableSectors = secretariats.flatMap((secretariat) =>
    secretariat.sectors.map((sector) => ({
      ...sector,
      secretariat,
    })),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, secretariatFilter, sectorFilter, pageSize]);

  useEffect(() => {
    if (!newSectorForm.secretariatId && secretariats[0]) {
      setNewSectorForm((current) => ({
        ...current,
        secretariatId: secretariats[0].id,
      }));
    }
  }, [newSectorForm.secretariatId, secretariats]);

  const filteredUsers = useMemo(() => {
    const term = normalize(search.trim());

    return (usersQuery.data ?? []).filter((listedUser) => {
      const memberships = listedUser.sectorMemberships ?? [];
      const matchesSearch =
        !term ||
        normalize(listedUser.name).includes(term) ||
        normalize(listedUser.email).includes(term);
      const matchesRole = roleFilter === 'ALL' || listedUser.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? listedUser.isActive : !listedUser.isActive);
      const matchesSecretariat =
        secretariatFilter === 'ALL' ||
        memberships.some((membership) => membership.sector.secretariat.id === secretariatFilter);
      const matchesSector =
        sectorFilter === 'ALL' ||
        memberships.some((membership) => membership.sector.id === sectorFilter);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesSecretariat &&
        matchesSector
      );
    });
  }, [
    roleFilter,
    search,
    secretariatFilter,
    sectorFilter,
    statusFilter,
    usersQuery.data,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const visibleUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

  const saveUserMutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        return api.updateUser(token!, editingUser.id, {
          name: userForm.name,
          email: userForm.email,
          password: userForm.password || undefined,
          role: userForm.role,
          isActive: userForm.isActive,
          avatarUrl: userForm.avatarUrl || undefined,
          sectorIds: userForm.sectorIds,
        });
      }

      return api.createUser(token!, {
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        isActive: userForm.isActive,
        avatarUrl: userForm.avatarUrl || undefined,
        sectorIds: userForm.sectorIds,
      });
    },
    onSuccess: async (savedUser) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      if (user?.id === savedUser.id) {
        syncUser(savedUser);
        if (savedUser.role !== 'ADMIN') {
          navigate('/projetos', { replace: true });
        }
      }
      closeDrawer();
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'Nao foi possivel salvar o usuario.',
      );
    },
  });

  const createSecretariatMutation = useMutation({
    mutationFn: () => api.createSecretariat(token!, { name: newSecretariatName.trim() }),
    onSuccess: async (createdSecretariat) => {
      await queryClient.invalidateQueries({ queryKey: ['secretariats'] });
      setNewSecretariatName('');
      setNewSectorForm((current) => ({
        ...current,
        secretariatId: createdSecretariat.id,
      }));
      setOrganizationError(null);
    },
    onError: (error) => {
      setOrganizationError(
        error instanceof ApiError ? error.message : 'Nao foi possivel criar a secretaria.',
      );
    },
  });

  const createSectorMutation = useMutation({
    mutationFn: () =>
      api.createSector(token!, {
        name: newSectorForm.name.trim(),
        secretariatId: newSectorForm.secretariatId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['secretariats'] });
      setNewSectorForm((current) => ({ ...current, name: '' }));
      setOrganizationError(null);
    },
    onError: (error) => {
      setOrganizationError(
        error instanceof ApiError ? error.message : 'Nao foi possivel criar o setor.',
      );
    },
  });

  function openCreateDrawer() {
    setEditingUser(null);
    setUserForm(initialUserForm);
    setFormError(null);
    setIsDrawerOpen(true);
  }

  function openEditDrawer(selectedUser: ApiUser) {
    setEditingUser(selectedUser);
    setUserForm({
      name: selectedUser.name,
      email: selectedUser.email,
      password: '',
      role: selectedUser.role,
      isActive: selectedUser.isActive,
      avatarUrl: selectedUser.avatarUrl ?? '',
      sectorIds:
        selectedUser.sectorMemberships?.map((membership) => membership.sector.id) ?? [],
    });
    setFormError(null);
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setEditingUser(null);
    setUserForm(initialUserForm);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    await saveUserMutation.mutateAsync();
  }

  function toggleSector(sectorId: string) {
    setUserForm((currentForm) => ({
      ...currentForm,
      sectorIds: currentForm.sectorIds.includes(sectorId)
        ? currentForm.sectorIds.filter((id) => id !== sectorId)
        : [...currentForm.sectorIds, sectorId],
    }));
  }

  function openOrganizationModal() {
    setOrganizationError(null);
    setIsOrganizationOpen(true);
  }

  const action = (
    <div className="page-header-actions">
      <button className="secondary-button" onClick={openOrganizationModal} type="button">
        Secretarias e setores
      </button>
      <button className="primary-button" onClick={openCreateDrawer} type="button">
        Novo usuario
      </button>
    </div>
  );

  return (
    <AppShell
      title="Usuarios"
      copy="Controle rapido de perfis, status e vinculos por setor."
      action={action}
    >
      {usersQuery.isLoading ? (
        <StatusState
          tone="loading"
          title="Carregando usuarios"
          copy="Estamos buscando a lista de pessoas cadastradas."
        />
      ) : null}

      {usersQuery.isError ? (
        <StatusState
          tone="error"
          title="Nao foi possivel carregar os usuarios"
          copy={
            usersQuery.error instanceof Error
              ? usersQuery.error.message
              : 'Tente novamente em instantes.'
          }
          action={
            <button className="secondary-button" onClick={() => void usersQuery.refetch()} type="button">
              Tentar de novo
            </button>
          }
        />
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError ? (
        (usersQuery.data ?? []).length > 0 ? (
          <section className="users-panel">
            <div className="users-toolbar">
              <div className="field-group users-search">
                <label className="field-label" htmlFor="users-search">
                  Buscar
                </label>
                <input
                  className="field-input"
                  id="users-search"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome ou e-mail"
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
                  onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
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
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
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
                  onChange={(event) => {
                    setSecretariatFilter(event.target.value);
                    setSectorFilter('ALL');
                  }}
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
                  onChange={(event) => setSectorFilter(event.target.value)}
                  value={sectorFilter}
                >
                  <option value="ALL">Todos</option>
                  {availableSectors
                    .filter(
                      (sector) =>
                        secretariatFilter === 'ALL' ||
                        sector.secretariat.id === secretariatFilter,
                    )
                    .map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {`${sector.secretariat.name} > ${sector.name}`}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Vinculos</th>
                    <th aria-label="Acoes" />
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.length > 0 ? (
                    visibleUsers.map((listedUser) => {
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
                            <span className={`badge ${listedUser.isActive ? 'badge-green' : 'badge-red'}`}>
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
                              onClick={() => openEditDrawer(listedUser)}
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

            <div className="pagination-row">
              <span className="muted-text">
                {filteredUsers.length} usuario{filteredUsers.length === 1 ? '' : 's'}
              </span>
              <div className="pagination-actions">
                <label className="pagination-size">
                  <span>Por pagina</span>
                  <select
                    className="field-input"
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    value={pageSize}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <button
                  className="secondary-button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  type="button"
                >
                  Anterior
                </button>
                <span className="muted-text">
                  {safePage} / {pageCount}
                </span>
                <button
                  className="secondary-button"
                  disabled={safePage >= pageCount}
                  onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                  type="button"
                >
                  Proxima
                </button>
              </div>
            </div>
          </section>
        ) : (
          <StatusState
            title="Nenhum usuario encontrado"
            copy="Cadastre o primeiro usuario para distribuir responsaveis e membros dos projetos."
            action={
              <button className="primary-button" onClick={openCreateDrawer} type="button">
                Novo usuario
              </button>
            }
          />
        )
      ) : null}

      {isDrawerOpen ? (
        <div
          className="drawer-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDrawer();
            }
          }}
        >
          <aside
            aria-modal="true"
            className="drawer-panel"
            role="dialog"
          >
            <header className="drawer-header">
              <div>
                <h2 className="drawer-title">
                  {editingUser ? 'Editar acessos' : 'Novo usuario'}
                </h2>
                <p className="drawer-copy">
                  Dados principais, status e vinculos por secretaria/setor.
                </p>
              </div>
              <button className="icon-button" onClick={closeDrawer} type="button">
                x
              </button>
            </header>

            <form className="drawer-body form-grid" id="user-form" onSubmit={handleSubmit}>
              <section className="drawer-section">
                <h3>Identificacao</h3>
                <div className="form-row">
                  <div className="field-group">
                    <label className="field-label" htmlFor="user-name">
                      Nome
                    </label>
                    <input
                      className="field-input"
                      id="user-name"
                      minLength={2}
                      onChange={(event) =>
                        setUserForm((currentForm) => ({
                          ...currentForm,
                          name: event.target.value,
                        }))
                      }
                      required
                      type="text"
                      value={userForm.name}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="user-email">
                      E-mail
                    </label>
                    <input
                      className="field-input"
                      id="user-email"
                      onChange={(event) =>
                        setUserForm((currentForm) => ({
                          ...currentForm,
                          email: event.target.value,
                        }))
                      }
                      required
                      type="email"
                      value={userForm.email}
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="user-avatar">
                    Avatar URL
                  </label>
                  <input
                    className="field-input"
                    id="user-avatar"
                    onChange={(event) =>
                      setUserForm((currentForm) => ({
                        ...currentForm,
                        avatarUrl: event.target.value,
                      }))
                    }
                    placeholder="Opcional"
                    type="url"
                    value={userForm.avatarUrl}
                  />
                </div>
              </section>

              <section className="drawer-section">
                <h3>Acesso</h3>
                <div className="form-row">
                  <div className="field-group">
                    <label className="field-label" htmlFor="user-role">
                      Perfil
                    </label>
                    <select
                      className="field-input"
                      id="user-role"
                      onChange={(event) =>
                        setUserForm((currentForm) => ({
                          ...currentForm,
                          role: event.target.value as UserRole,
                        }))
                      }
                      value={userForm.role}
                    >
                      <option value="MEMBER">Membro</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="user-status">
                      Status
                    </label>
                    <select
                      className="field-input"
                      id="user-status"
                      onChange={(event) =>
                        setUserForm((currentForm) => ({
                          ...currentForm,
                          isActive: event.target.value === 'ACTIVE',
                        }))
                      }
                      value={userForm.isActive ? 'ACTIVE' : 'INACTIVE'}
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="INACTIVE">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="user-password">
                    {editingUser ? 'Nova senha' : 'Senha'}
                  </label>
                  <input
                    className="field-input"
                    id="user-password"
                    minLength={editingUser ? undefined : 8}
                    onChange={(event) =>
                      setUserForm((currentForm) => ({
                        ...currentForm,
                        password: event.target.value,
                      }))
                    }
                    placeholder={editingUser ? 'Deixe em branco para manter a atual' : 'Minimo de 8 caracteres'}
                    required={!editingUser}
                    type="password"
                    value={userForm.password}
                  />
                </div>
              </section>

              <section className="drawer-section">
                <h3>Vinculos</h3>
                <p className="field-helper">
                  Estes setores definem quais pastas o membro consegue visualizar.
                </p>
                <div className="sector-picker">
                  {secretariatsQuery.isLoading ? (
                    <p className="field-helper">Carregando setores...</p>
                  ) : null}
                  {secretariats.length > 0 ? (
                    secretariats.map((secretariat) => (
                      <div className="sector-picker-group" key={secretariat.id}>
                        <p>{secretariat.name}</p>
                        <div className="checkbox-list checkbox-list-compact">
                          {secretariat.sectors.length > 0 ? (
                            secretariat.sectors.map((sector) => (
                              <label className="checkbox-item" key={sector.id}>
                                <input
                                  checked={userForm.sectorIds.includes(sector.id)}
                                  onChange={() => toggleSector(sector.id)}
                                  type="checkbox"
                                />
                                <span>{sector.name}</span>
                              </label>
                            ))
                          ) : (
                            <span className="muted-text">Sem setores cadastrados.</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="field-helper">
                      Nenhuma secretaria cadastrada ainda.
                    </p>
                  )}
                </div>
              </section>

              {formError ? <p className="form-error">{formError}</p> : null}
            </form>

            <footer className="drawer-footer">
              <button className="secondary-button" onClick={closeDrawer} type="button">
                Cancelar
              </button>
              <button
                className="primary-button"
                disabled={saveUserMutation.isPending}
                form="user-form"
                type="submit"
              >
                {saveUserMutation.isPending
                  ? 'Salvando...'
                  : editingUser
                    ? 'Salvar acessos'
                    : 'Criar usuario'}
              </button>
            </footer>
          </aside>
        </div>
      ) : null}

      <Modal
        description="Cadastro rapido da arvore organizacional usada nas pastas e nos vinculos dos usuarios."
        footer={
          <button
            className="secondary-button"
            onClick={() => setIsOrganizationOpen(false)}
            type="button"
          >
            Fechar
          </button>
        }
        onClose={() => setIsOrganizationOpen(false)}
        open={isOrganizationOpen}
        title="Secretarias e setores"
      >
        <div className="organization-manager">
          <form
            className="inline-form organization-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (newSecretariatName.trim()) {
                void createSecretariatMutation.mutateAsync();
              }
            }}
          >
            <div className="field-group">
              <label className="field-label" htmlFor="secretariat-name">
                Nova secretaria
              </label>
              <input
                className="field-input"
                id="secretariat-name"
                onChange={(event) => setNewSecretariatName(event.target.value)}
                placeholder="Ex: SEMED"
                value={newSecretariatName}
              />
            </div>
            <button
              className="secondary-button"
              disabled={createSecretariatMutation.isPending || !newSecretariatName.trim()}
              type="submit"
            >
              Adicionar
            </button>
          </form>

          <form
            className="inline-form organization-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (newSectorForm.name.trim() && newSectorForm.secretariatId) {
                void createSectorMutation.mutateAsync();
              }
            }}
          >
            <div className="field-group">
              <label className="field-label" htmlFor="sector-secretariat">
                Secretaria
              </label>
              <select
                className="field-input"
                id="sector-secretariat"
                onChange={(event) =>
                  setNewSectorForm((current) => ({
                    ...current,
                    secretariatId: event.target.value,
                  }))
                }
                value={newSectorForm.secretariatId}
              >
                <option value="">Selecione</option>
                {secretariats.map((secretariat) => (
                  <option key={secretariat.id} value={secretariat.id}>
                    {secretariat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="sector-name">
                Novo setor
              </label>
              <input
                className="field-input"
                id="sector-name"
                onChange={(event) =>
                  setNewSectorForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ex: ASCOM"
                value={newSectorForm.name}
              />
            </div>
            <button
              className="secondary-button"
              disabled={
                createSectorMutation.isPending ||
                !newSectorForm.name.trim() ||
                !newSectorForm.secretariatId
              }
              type="submit"
            >
              Adicionar setor
            </button>
          </form>

          {organizationError ? <p className="form-error">{organizationError}</p> : null}

          <div className="organization-admin-list">
            {secretariats.map((secretariat) => (
              <section className="organization-admin-card" key={secretariat.id}>
                <strong>{secretariat.name}</strong>
                <div className="badge-row">
                  {secretariat.sectors.length > 0 ? (
                    secretariat.sectors.map((sector) => (
                      <span className="badge badge-gray" key={sector.id}>
                        {sector.name}
                      </span>
                    ))
                  ) : (
                    <span className="muted-text">Sem setores</span>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
