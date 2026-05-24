import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../app/auth-provider';
import { AppShell } from '../components/app-shell';
import { StatusState } from '../components/status-state';
import { OrganizationModal } from '../features/users/organization-modal';
import { UserDrawer } from '../features/users/user-drawer';
import { UsersPagination } from '../features/users/users-pagination';
import { UsersTable } from '../features/users/users-table';
import { UsersToolbar } from '../features/users/users-toolbar';
import {
  initialNewSectorForm,
  initialUserForm,
  type RoleFilter,
  type StatusFilter,
  type UserFormState,
} from '../features/users/users-types';
import { normalize } from '../features/users/users-utils';
import { ApiError, api } from '../services/api';
import type { ApiUser } from '../types/api';

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
  const [newSectorForm, setNewSectorForm] = useState(initialNewSectorForm);

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

  function updateUserForm(updates: Partial<UserFormState>) {
    setUserForm((currentForm) => ({
      ...currentForm,
      ...updates,
    }));
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
            <UsersToolbar
              availableSectors={availableSectors}
              onRoleFilterChange={setRoleFilter}
              onSearchChange={setSearch}
              onSecretariatFilterChange={(value) => {
                setSecretariatFilter(value);
                setSectorFilter('ALL');
              }}
              onSectorFilterChange={setSectorFilter}
              onStatusFilterChange={setStatusFilter}
              roleFilter={roleFilter}
              search={search}
              secretariatFilter={secretariatFilter}
              secretariats={secretariats}
              sectorFilter={sectorFilter}
              statusFilter={statusFilter}
            />

            <UsersTable onEditUser={openEditDrawer} users={visibleUsers} />

            <UsersPagination
              currentPage={safePage}
              onNextPage={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              onPageSizeChange={setPageSize}
              onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
              pageCount={pageCount}
              pageSize={pageSize}
              totalUsers={filteredUsers.length}
            />
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

      <UserDrawer
        editingUser={editingUser}
        error={formError}
        form={userForm}
        isOpen={isDrawerOpen}
        isSaving={saveUserMutation.isPending}
        isSecretariatsLoading={secretariatsQuery.isLoading}
        onChange={updateUserForm}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
        onToggleSector={toggleSector}
        secretariats={secretariats}
      />

      <OrganizationModal
        error={organizationError}
        isCreatingSecretariat={createSecretariatMutation.isPending}
        isCreatingSector={createSectorMutation.isPending}
        newSecretariatName={newSecretariatName}
        newSectorForm={newSectorForm}
        onClose={() => setIsOrganizationOpen(false)}
        onCreateSecretariat={() => void createSecretariatMutation.mutateAsync()}
        onCreateSector={() => void createSectorMutation.mutateAsync()}
        onSecretariatNameChange={setNewSecretariatName}
        onSectorFormChange={setNewSectorForm}
        open={isOrganizationOpen}
        secretariats={secretariats}
      />
    </AppShell>
  );
}
