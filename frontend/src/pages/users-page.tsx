import { useState, type FormEvent } from 'react';
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
  avatarUrl: string;
};

const initialUserForm: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'MEMBER',
  avatarUrl: '',
};

export function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { syncUser, token, user } = useAuth();
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(initialUserForm);

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(token!),
    enabled: Boolean(token),
  });

  const saveUserMutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        return api.updateUser(token!, editingUser.id, {
          name: userForm.name,
          email: userForm.email,
          password: userForm.password || undefined,
          role: userForm.role,
          avatarUrl: userForm.avatarUrl || undefined,
        });
      }

      return api.createUser(token!, {
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        avatarUrl: userForm.avatarUrl || undefined,
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
      setIsModalOpen(false);
      setEditingUser(null);
      setUserForm(initialUserForm);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'Nao foi possivel salvar o usuario.',
      );
    },
  });

  function openCreateModal() {
    setEditingUser(null);
    setUserForm(initialUserForm);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(selectedUser: ApiUser) {
    setEditingUser(selectedUser);
    setUserForm({
      name: selectedUser.name,
      email: selectedUser.email,
      password: '',
      role: selectedUser.role,
      avatarUrl: selectedUser.avatarUrl ?? '',
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    await saveUserMutation.mutateAsync();
  }

  return (
    <AppShell
      title="Usuarios"
      copy="Gestao basica de usuarios do MVP, restrita ao perfil admin com criacao e edicao simples."
      action={
        <button className="primary-button" onClick={openCreateModal} type="button">
          Novo usuario
        </button>
      }
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
        usersQuery.data && usersQuery.data.length > 0 ? (
          <table className="users-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th aria-label="Acoes" />
              </tr>
            </thead>
            <tbody>
              {usersQuery.data.map((listedUser) => (
                <tr key={listedUser.email}>
                  <td>{listedUser.name}</td>
                  <td>{listedUser.email}</td>
                  <td>
                    <span className={`badge ${listedUser.role === 'ADMIN' ? 'badge-blue' : 'badge-gray'}`}>
                      {listedUser.role === 'ADMIN' ? 'Admin' : 'Membro'}
                    </span>
                  </td>
                  <td className="users-table-actions">
                    <button
                      className="secondary-button"
                      onClick={() => openEditModal(listedUser)}
                      type="button"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <StatusState
            title="Nenhum usuario encontrado"
            copy="Cadastre o primeiro usuario para distribuir responsaveis e membros dos projetos."
            action={
              <button className="primary-button" onClick={openCreateModal} type="button">
                Novo usuario
              </button>
            }
          />
        )
      ) : null}

      <Modal
        description="No MVP, o perfil global define se a pessoa administra usuarios e projetos ou apenas participa deles."
        footer={
          <>
            <button className="secondary-button" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={saveUserMutation.isPending}
              form="user-form"
              type="submit"
            >
              {saveUserMutation.isPending ? 'Salvando...' : editingUser ? 'Salvar alteracoes' : 'Criar usuario'}
            </button>
          </>
        }
        onClose={() => setIsModalOpen(false)}
        open={isModalOpen}
        title={editingUser ? 'Editar usuario' : 'Novo usuario'}
      >
        <form className="form-grid" id="user-form" onSubmit={handleSubmit}>
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

          <div className="form-row">
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

          {formError ? <p className="form-error">{formError}</p> : null}
        </form>
      </Modal>
    </AppShell>
  );
}
