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

  it('validates card required fields and supports move + archive', async () => {
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
