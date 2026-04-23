import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Gestao GTI API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: string;

  const adminCredentials = {
    email: 'admin@empresa.com',
    password: 'admin123456',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase();

    const passwordHash = await hash(adminCredentials.password, 10);
    const admin = await prisma.user.create({
      data: {
        name: 'Administrador Inicial',
        email: adminCredentials.email,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    adminId = admin.id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  it('rejects invalid login', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminCredentials.email,
        password: 'senha-incorreta',
      })
      .expect(401);
  });

  it('logs in with seeded admin credentials', async () => {
    const response = await loginAsAdmin();

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.email).toBe(adminCredentials.email);
    expect(response.body.user.role).toBe(UserRole.ADMIN);
  });

  it('lets admin create users and rejects duplicate emails', async () => {
    const adminToken = await getAdminToken();

    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ana Lima',
        email: 'ana@empresa.com',
        password: 'senha12345',
        role: UserRole.MEMBER,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ana Lima',
        email: 'ana@empresa.com',
        password: 'senha12345',
        role: UserRole.MEMBER,
      })
      .expect(409);
  });

  it('creates project with board and fixed columns', async () => {
    const adminToken = await getAdminToken();

    const response = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto MVP',
        description: 'Projeto de teste',
        deadline: '2026-07-01',
        ownerId: adminId,
      })
      .expect(201);

    expect(response.body.deadline).toContain('2026-07-01');
    expect(response.body.board.columns).toHaveLength(3);
    expect(response.body.board.columns.map((column: { title: string }) => column.title)).toEqual([
      'A fazer',
      'Em andamento',
      'Concluido',
    ]);
  });

  it('limits member project visibility and blocks member from users endpoints', async () => {
    const adminToken = await getAdminToken();
    const member = await createMember('membro@empresa.com');

    await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto do membro',
        ownerId: adminId,
        memberIds: [member.id],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto privado',
        ownerId: adminId,
      })
      .expect(201);

    const memberToken = await getTokenForUser(member.email, 'membro1234');

    const projectsResponse = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(projectsResponse.body).toHaveLength(1);
    expect(projectsResponse.body[0].name).toBe('Projeto do membro');

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
  });

  it('lets admin, owner, and manager delete projects while blocking regular members', async () => {
    const adminToken = await getAdminToken();
    const member = await createMember('delete-member@empresa.com');
    const manager = await createMember('delete-manager@empresa.com');
    const ownerMember = await createMember('delete-owner@empresa.com');
    const memberToken = await getTokenForUser(member.email, 'membro1234');
    const managerToken = await getTokenForUser(manager.email, 'membro1234');
    const ownerToken = await getTokenForUser(ownerMember.email, 'membro1234');

    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto descartavel',
        ownerId: adminId,
        memberIds: [member.id],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/projects/${projectResponse.body.id}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: manager.id,
        role: 'MANAGER',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/projects/${projectResponse.body.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/projects/${projectResponse.body.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200, { success: true });

    const ownerProjectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Projeto do proprio membro',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/projects/${ownerProjectResponse.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200, { success: true });

    const adminOnlyProjectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto admin',
        ownerId: adminId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/projects/${adminOnlyProjectResponse.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { success: true });

    const projectsResponse = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      projectsResponse.body.some((project: { id: string }) => project.id === projectResponse.body.id),
    ).toBe(false);
    expect(
      projectsResponse.body.some((project: { id: string }) => project.id === ownerProjectResponse.body.id),
    ).toBe(false);
    expect(
      projectsResponse.body.some(
        (project: { id: string }) => project.id === adminOnlyProjectResponse.body.id,
      ),
    ).toBe(false);
  });

  it('validates card required fields and supports move + archive + restore', async () => {
    const adminToken = await getAdminToken();
    const member = await createMember('card-owner@empresa.com');

    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto com cards',
        ownerId: adminId,
        memberIds: [member.id],
      })
      .expect(201);

    const [todoColumn, doingColumn] = projectResponse.body.board.columns;

    await request(app.getHttpServer())
      .post(`/api/columns/${todoColumn.id}/cards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Card invalido',
        priority: 'HIGH',
        dueDate: '2026-07-09',
      })
      .expect(400);

    const cardResponse = await request(app.getHttpServer())
      .post(`/api/columns/${todoColumn.id}/cards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Card valido',
        description: 'Descricao opcional',
        assigneeId: member.id,
        priority: 'HIGH',
      })
      .expect(201);

    expect(cardResponse.body.dueDate).toBeNull();

    await request(app.getHttpServer())
      .patch(`/api/cards/${cardResponse.body.id}/move`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        targetColumnId: doingColumn.id,
        targetPosition: 0,
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/cards/${cardResponse.body.id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    const boardResponse = await request(app.getHttpServer())
      .get(`/api/projects/${projectResponse.body.id}/board`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const activeCardIds = boardResponse.body.columns.flatMap(
      (column: { cards: Array<{ id: string }> }) => column.cards.map((card) => card.id),
    );

    expect(activeCardIds).not.toContain(cardResponse.body.id);

    const archivedResponse = await request(app.getHttpServer())
      .get(`/api/projects/${projectResponse.body.id}/archived-cards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(archivedResponse.body).toHaveLength(1);
    expect(archivedResponse.body[0].id).toBe(cardResponse.body.id);

    await request(app.getHttpServer())
      .patch(`/api/cards/${cardResponse.body.id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    const boardResponseAfterRestore = await request(app.getHttpServer())
      .get(`/api/projects/${projectResponse.body.id}/board`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const restoredCardIds = boardResponseAfterRestore.body.columns.flatMap(
      (column: { cards: Array<{ id: string }> }) => column.cards.map((card) => card.id),
    );

    expect(restoredCardIds).toContain(cardResponse.body.id);
  });

  it('supports checklist and comments for project members', async () => {
    const adminToken = await getAdminToken();
    const member = await createMember('colaboracao@empresa.com');

    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto colaborativo',
        ownerId: adminId,
        memberIds: [member.id],
      })
      .expect(201);

    const todoColumn = projectResponse.body.board.columns[0];

    const cardResponse = await request(app.getHttpServer())
      .post(`/api/columns/${todoColumn.id}/cards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Card colaborativo',
        assigneeId: member.id,
        priority: 'MEDIUM',
        dueDate: '2026-07-11T00:00:00.000Z',
      })
      .expect(201);

    const memberToken = await getTokenForUser(member.email, 'membro1234');

    const firstChecklistItem = await request(app.getHttpServer())
      .post(`/api/cards/${cardResponse.body.id}/checklist-items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Escrever roteiro',
      })
      .expect(201);

    const secondChecklistItem = await request(app.getHttpServer())
      .post(`/api/cards/${cardResponse.body.id}/checklist-items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Revisar conteudo',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/checklist-items/${secondChecklistItem.body.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        done: true,
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/checklist-items/${secondChecklistItem.body.id}/reorder`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        targetPosition: 0,
      })
      .expect(200);

    const checklistResponse = await request(app.getHttpServer())
      .get(`/api/cards/${cardResponse.body.id}/checklist-items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(checklistResponse.body).toHaveLength(2);
    expect(checklistResponse.body[0].id).toBe(secondChecklistItem.body.id);
    expect(checklistResponse.body[0].done).toBe(true);
    expect(checklistResponse.body[1].id).toBe(firstChecklistItem.body.id);

    await request(app.getHttpServer())
      .post(`/api/cards/${cardResponse.body.id}/comments`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        content: 'Checklist iniciado e primeira revisao concluida.',
      })
      .expect(201);

    const commentsResponse = await request(app.getHttpServer())
      .get(`/api/cards/${cardResponse.body.id}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(commentsResponse.body).toHaveLength(1);
    expect(commentsResponse.body[0].content).toBe(
      'Checklist iniciado e primeira revisao concluida.',
    );
    expect(commentsResponse.body[0].author.email).toBe(member.email);
  });

  it('recreates fixed board structure for legacy projects without board', async () => {
    const adminToken = await getAdminToken();

    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto legado',
        ownerId: adminId,
      })
      .expect(201);

    await prisma.board.delete({
      where: {
        projectId: projectResponse.body.id,
      },
    });

    const boardResponse = await request(app.getHttpServer())
      .get(`/api/projects/${projectResponse.body.id}/board`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(boardResponse.body.columns.map((column: { title: string }) => column.title)).toEqual([
      'A fazer',
      'Em andamento',
      'Concluido',
    ]);
  });

  it('manages project members: add, duplicate rejection, remove, owner protection', async () => {
    const adminToken = await getAdminToken();
    const member = await createMember('gerencia-membro@empresa.com');
    const member2 = await createMember('gerencia-membro2@empresa.com');

    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto membros',
        ownerId: adminId,
      })
      .expect(201);

    const projectId = projectResponse.body.id;

    // Add member
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: member.id, role: 'MEMBER' })
      .expect(201);

    // Reject duplicate
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: member.id })
      .expect(409);

    // Add second member as viewer
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: member2.id, role: 'VIEWER' })
      .expect(201);

    // Verify project has 3 members (admin + member + member2)
    const projectDetail = await request(app.getHttpServer())
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(projectDetail.body.members).toHaveLength(3);

    // Remove member
    await request(app.getHttpServer())
      .delete(`/api/projects/${projectId}/members/${member2.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Verify project has 2 members
    const projectDetail2 = await request(app.getHttpServer())
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(projectDetail2.body.members).toHaveLength(2);

    // Cannot remove owner
    await request(app.getHttpServer())
      .delete(`/api/projects/${projectId}/members/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    // Member cannot manage members
    const memberToken = await getTokenForUser(member.email, 'membro1234');

    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ userId: member2.id })
      .expect(403);
  });

  it('supports column CRUD: create, rename, reorder, and delete', async () => {
    const adminToken = await getAdminToken();

    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto colunas',
        ownerId: adminId,
      })
      .expect(201);

    const boardId = projectResponse.body.board.id;
    const columns = projectResponse.body.board.columns;

    expect(columns).toHaveLength(3);

    // Add a new column
    const newColumn = await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Revisao' })
      .expect(201);

    expect(newColumn.body.title).toBe('Revisao');
    expect(newColumn.body.position).toBe(3);

    // Rename a column
    const renamedColumn = await request(app.getHttpServer())
      .patch(`/api/columns/${columns[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Backlog' })
      .expect(200);

    expect(renamedColumn.body.title).toBe('Backlog');

    // Reorder: move "Backlog" (pos 0) to pos 2
    await request(app.getHttpServer())
      .patch(`/api/columns/${columns[0].id}/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetPosition: 2 })
      .expect(200);

    // Verify board state
    const boardResponse = await request(app.getHttpServer())
      .get(`/api/projects/${projectResponse.body.id}/board`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const boardColumns = boardResponse.body.columns;
    expect(boardColumns).toHaveLength(4);
    expect(boardColumns[0].title).toBe('Em andamento');
    expect(boardColumns[1].title).toBe('Concluido');
    expect(boardColumns[2].title).toBe('Backlog');
    expect(boardColumns[3].title).toBe('Revisao');

    // Delete empty column
    await request(app.getHttpServer())
      .delete(`/api/columns/${newColumn.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Verify 3 columns remain
    const boardResponse2 = await request(app.getHttpServer())
      .get(`/api/projects/${projectResponse.body.id}/board`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(boardResponse2.body.columns).toHaveLength(3);
  });

  it('prevents deleting a column that has active cards', async () => {
    const adminToken = await getAdminToken();
    const member = await createMember('coluna-card@empresa.com');

    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto coluna com card',
        ownerId: adminId,
        memberIds: [member.id],
      })
      .expect(201);

    const todoColumn = projectResponse.body.board.columns[0];

    // Create a card in the column
    await request(app.getHttpServer())
      .post(`/api/columns/${todoColumn.id}/cards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Card bloqueante',
        assigneeId: member.id,
        priority: 'LOW',
      })
      .expect(201);

    // Cannot delete column with active cards
    await request(app.getHttpServer())
      .delete(`/api/columns/${todoColumn.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('blocks viewers from modifying columns', async () => {
    const adminToken = await getAdminToken();
    const viewer = await createMember('viewer-coluna@empresa.com');

    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto viewer coluna',
        ownerId: adminId,
      })
      .expect(201);

    // Add viewer
    await request(app.getHttpServer())
      .post(`/api/projects/${projectResponse.body.id}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: viewer.id, role: 'VIEWER' })
      .expect(201);

    const viewerToken = await getTokenForUser(viewer.email, 'membro1234');
    const boardId = projectResponse.body.board.id;
    const columnId = projectResponse.body.board.columns[0].id;

    // Viewer cannot create column
    await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ title: 'Nova' })
      .expect(403);

    // Viewer cannot rename column
    await request(app.getHttpServer())
      .patch(`/api/columns/${columnId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ title: 'Renomeada' })
      .expect(403);

    // Viewer cannot delete column
    await request(app.getHttpServer())
      .delete(`/api/columns/${columnId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
  });

  it('manages project folders: create, list, assign project, remove and detach', async () => {
    const adminToken = await getAdminToken();

    // Create folder
    const folderResponse = await request(app.getHttpServer())
      .post('/api/folders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Prefeitura' })
      .expect(201);

    expect(folderResponse.body.name).toBe('Prefeitura');
    const folderId = folderResponse.body.id;

    // List folders
    const foldersResponse = await request(app.getHttpServer())
      .get('/api/folders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(foldersResponse.body).toHaveLength(1);

    // Create project
    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto da Prefeitura',
        ownerId: adminId,
      })
      .expect(201);

    const projectId = projectResponse.body.id;

    // Assign project to folder
    const updatedProject = await request(app.getHttpServer())
      .patch(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ folderId })
      .expect(200);

    expect(updatedProject.body.folderId).toBe(folderId);

    // Move project out of folder
    const detached = await request(app.getHttpServer())
      .patch(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ folderId: null })
      .expect(200);

    expect(detached.body.folderId).toBeNull();

    // Re-assign and then delete folder — project must remain (folderId becomes null)
    await request(app.getHttpServer())
      .patch(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ folderId })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/folders/${folderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const projectAfter = await request(app.getHttpServer())
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(projectAfter.body.folderId).toBeNull();
  });

  it('blocks members from viewing and managing folders', async () => {
    const adminToken = await getAdminToken();
    const member = await createMember('pasta-membro@empresa.com');
    const memberToken = await getTokenForUser(member.email, 'membro1234');

    // Member cannot list folders
    await request(app.getHttpServer())
      .get('/api/folders')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);

    // Member cannot create
    await request(app.getHttpServer())
      .post('/api/folders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Pasta' })
      .expect(403);

    // Admin creates one
    const folderResponse = await request(app.getHttpServer())
      .post('/api/folders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Pasta admin' })
      .expect(201);

    // Member cannot rename
    await request(app.getHttpServer())
      .patch(`/api/folders/${folderResponse.body.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Renomeada' })
      .expect(403);

    // Member cannot delete
    await request(app.getHttpServer())
      .delete(`/api/folders/${folderResponse.body.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
  });

  it('lets the logged-in user change their own password', async () => {
    await createMember('change-pwd@empresa.com');
    const memberToken = await loginUser('change-pwd@empresa.com', 'membro1234');

    // Wrong current password -> 401
    await request(app.getHttpServer())
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ currentPassword: 'errada1234', newPassword: 'novaSegura1' })
      .expect(401);

    // Same password -> 400
    await request(app.getHttpServer())
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ currentPassword: 'membro1234', newPassword: 'membro1234' })
      .expect(400);

    // Successful change
    await request(app.getHttpServer())
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ currentPassword: 'membro1234', newPassword: 'novaSegura1' })
      .expect(200);

    // Old password no longer logs in
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'change-pwd@empresa.com', password: 'membro1234' })
      .expect(401);

    // New password works
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'change-pwd@empresa.com', password: 'novaSegura1' })
      .expect(201);
  });

  it('allows a member to create their own project (auto-assigned as owner)', async () => {
    const member = await createMember('criador@empresa.com');
    const memberToken = await loginUser('criador@empresa.com', 'membro1234');

    // Member creates project without specifying owner — backend forces self
    const created = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Projeto criado por membro' })
      .expect(201);

    expect(created.body.ownerId).toBe(member.id);
    expect(created.body.members).toHaveLength(1);
    expect(created.body.members[0].user.id).toBe(member.id);

    // Member sees the project they own in their list
    const list = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(list.body.find((p: { id: string }) => p.id === created.body.id)).toBeDefined();
  });

  it('allows viewers to read the project but blocks write operations', async () => {
    const adminToken = await getAdminToken();
    const member = await createMember('editor@empresa.com');
    const viewer = await createMember('viewer@empresa.com');

    const projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Projeto com viewer',
        ownerId: adminId,
        memberIds: [member.id],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/projects/${projectResponse.body.id}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: viewer.id,
        role: 'VIEWER',
      })
      .expect(201);

    const todoColumn = projectResponse.body.board.columns[0];

    const cardResponse = await request(app.getHttpServer())
      .post(`/api/columns/${todoColumn.id}/cards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Card somente leitura',
        assigneeId: member.id,
        priority: 'MEDIUM',
        dueDate: '2026-07-12T00:00:00.000Z',
      })
      .expect(201);

    const viewerToken = await getTokenForUser(viewer.email, 'membro1234');

    await request(app.getHttpServer())
      .get(`/api/projects/${projectResponse.body.id}/board`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/cards/${cardResponse.body.id}/comments`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        content: 'Nao deveria comentar.',
      })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/cards/${cardResponse.body.id}/checklist-items`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        title: 'Nao deveria criar item.',
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/cards/${cardResponse.body.id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        title: 'Tentativa de edicao',
        assigneeId: member.id,
        priority: 'HIGH',
        dueDate: '2026-07-13T00:00:00.000Z',
      })
      .expect(403);
  });

  it('covers user update, validations, and not-found cases', async () => {
    const adminToken = await getAdminToken();

    const created = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bea', email: 'bea@empresa.com', password: 'senha12345', role: UserRole.MEMBER })
      .expect(201);

    const other = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Caio', email: 'caio@empresa.com', password: 'senha12345', role: UserRole.MEMBER })
      .expect(201);

    // Update name + password + avatar
    await request(app.getHttpServer())
      .patch(`/api/users/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Beatriz', password: 'novasenha123', avatarUrl: 'https://x/y.png' })
      .expect(200);

    // Email conflict on update
    await request(app.getHttpServer())
      .patch(`/api/users/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'caio@empresa.com' })
      .expect(409);

    // Updating to same email is allowed
    await request(app.getHttpServer())
      .patch(`/api/users/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'bea@empresa.com' })
      .expect(200);

    // Update non-existing user
    await request(app.getHttpServer())
      .patch('/api/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nome valido' })
      .expect(404);

    // Login with new password
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'bea@empresa.com', password: 'novasenha123' })
      .expect(201);

    // Project create with non-existing owner -> 404
    await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sem owner', ownerId: '00000000-0000-0000-0000-000000000000' })
      .expect(404);

    // Project create with non-existing memberIds -> 404
    await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Membros invalidos',
        ownerId: adminId,
        memberIds: ['00000000-0000-0000-0000-000000000000'],
      })
      .expect((res) => {
        if (![400, 404].includes(res.status)) {
          throw new Error(`Expected 400 or 404, got ${res.status}`);
        }
      });

    // Member cannot update users
    const memberToken = await loginUser('bea@empresa.com', 'novasenha123');
    await request(app.getHttpServer())
      .patch(`/api/users/${other.body.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'X' })
      .expect(403);
  });

  it('covers project update flows and folder not-found', async () => {
    const adminToken = await getAdminToken();
    const newOwner = await createMember('novo-owner@empresa.com');

    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Projeto edit', ownerId: adminId })
      .expect(201);

    // Update name, description, deadline, status
    const updated = await request(app.getHttpServer())
      .patch(`/api/projects/${project.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Renomeado',
        description: 'Nova descricao',
        deadline: '2027-01-15',
        status: 'PAUSED',
      })
      .expect(200);

    expect(updated.body.name).toBe('Renomeado');
    expect(updated.body.status).toBe('PAUSED');

    // Change owner -> upserts MANAGER membership
    await request(app.getHttpServer())
      .patch(`/api/projects/${project.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ownerId: newOwner.id })
      .expect(200);

    // Change owner to non-existing -> 404
    await request(app.getHttpServer())
      .patch(`/api/projects/${project.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ownerId: '00000000-0000-0000-0000-000000000000' })
      .expect(404);

    // Set folderId to non-existing -> 404
    await request(app.getHttpServer())
      .patch(`/api/projects/${project.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ folderId: '00000000-0000-0000-0000-000000000000' })
      .expect(404);

    // Update non-existing project -> 404
    await request(app.getHttpServer())
      .patch('/api/projects/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nome valido' })
      .expect(404);

    // Delete non-existing project -> 404
    await request(app.getHttpServer())
      .delete('/api/projects/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    // Add member: project not found -> 404
    await request(app.getHttpServer())
      .post('/api/projects/00000000-0000-0000-0000-000000000000/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: newOwner.id })
      .expect(404);

    // Remove member that isn't in project -> 404
    const stranger = await createMember('fora@empresa.com');
    await request(app.getHttpServer())
      .delete(`/api/projects/${project.body.id}/members/${stranger.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('covers folder not-found and rename', async () => {
    const adminToken = await getAdminToken();

    const folder = await request(app.getHttpServer())
      .post('/api/folders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Original' })
      .expect(201);

    // Rename
    const renamed = await request(app.getHttpServer())
      .patch(`/api/folders/${folder.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Renomeada' })
      .expect(200);
    expect(renamed.body.name).toBe('Renomeada');

    // Rename non-existing -> 404
    await request(app.getHttpServer())
      .patch('/api/folders/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nome valido' })
      .expect(404);

    // Delete non-existing -> 404
    await request(app.getHttpServer())
      .delete('/api/folders/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('covers comments validations: empty, archived card, not found', async () => {
    const adminToken = await getAdminToken();
    const member = await createMember('coment-test@empresa.com');

    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Coment proj', ownerId: adminId, memberIds: [member.id] })
      .expect(201);

    const todoColumn = project.body.board.columns[0];

    const card = await request(app.getHttpServer())
      .post(`/api/columns/${todoColumn.id}/cards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Card coment', assigneeId: member.id, priority: 'LOW' })
      .expect(201);

    // Comment on non-existing card
    await request(app.getHttpServer())
      .post('/api/cards/00000000-0000-0000-0000-000000000000/comments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: 'oi' })
      .expect(404);

    // List comments on non-existing card
    await request(app.getHttpServer())
      .get('/api/cards/00000000-0000-0000-0000-000000000000/comments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    // Empty content (only spaces) — DTO rejects min length 1 first; use a string of spaces
    await request(app.getHttpServer())
      .post(`/api/cards/${card.body.id}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: '   ' })
      .expect(400);

    // Archive the card
    await request(app.getHttpServer())
      .patch(`/api/cards/${card.body.id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    // Cannot comment on archived card
    await request(app.getHttpServer())
      .post(`/api/cards/${card.body.id}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: 'tarde demais' })
      .expect(400);
  });

  it('covers project access errors: non-member sees 403, missing project 403', async () => {
    const adminToken = await getAdminToken();
    const outsider = await createMember('outsider@empresa.com');

    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Privado', ownerId: adminId })
      .expect(201);

    const outsiderToken = await getTokenForUser(outsider.email, 'membro1234');

    // Non-member cannot view project detail
    await request(app.getHttpServer())
      .get(`/api/projects/${project.body.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);

    // Non-member cannot view board
    await request(app.getHttpServer())
      .get(`/api/projects/${project.body.id}/board`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);

    // Random non-existing project -> 403 for non-admin
    await request(app.getHttpServer())
      .get('/api/projects/00000000-0000-0000-0000-000000000000/board')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);
  });

  it('covers card assignee validation outside project', async () => {
    const adminToken = await getAdminToken();
    const member = await createMember('valido@empresa.com');
    const stranger = await createMember('estranho@empresa.com');

    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Card assignee', ownerId: adminId, memberIds: [member.id] })
      .expect(201);

    const todoColumn = project.body.board.columns[0];

    // Stranger is not member -> 400
    await request(app.getHttpServer())
      .post(`/api/columns/${todoColumn.id}/cards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Card', assigneeId: stranger.id, priority: 'LOW' })
      .expect(400);
  });

  async function loginUser(email: string, password: string) {
    return getTokenForUser(email, password);
  }

  async function cleanDatabase() {
    await prisma.activityLog.deleteMany();
    await prisma.cardLabel.deleteMany();
    await prisma.label.deleteMany();
    await prisma.checklistItem.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.card.deleteMany();
    await prisma.column.deleteMany();
    await prisma.board.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.projectFolder.deleteMany();
    await prisma.user.deleteMany();
  }

  async function createMember(email: string) {
    const passwordHash = await hash('membro1234', 10);

    return prisma.user.create({
      data: {
        name: 'Membro',
        email,
        passwordHash,
        role: UserRole.MEMBER,
      },
    });
  }

  async function loginAsAdmin() {
    return request(app.getHttpServer()).post('/api/auth/login').send(adminCredentials);
  }

  async function getAdminToken() {
    const response = await loginAsAdmin();
    return response.body.accessToken as string;
  }

  async function getTokenForUser(email: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body.accessToken as string;
  }
});
