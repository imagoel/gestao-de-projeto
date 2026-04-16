import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectRole, ProjectStatus } from '@prisma/client';

import { ProjectAccessService } from '../common/services/project-access.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DEFAULT_BOARD_COLUMNS } from '../common/constants/default-board-columns';
import { normalizeDateInput } from '../common/utils/normalize-date-input.util';
import { PrismaService } from '../prisma/prisma.service';
import { publicUserSelect } from '../users/user-select';
import { UsersService } from '../users/users.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const projectDetailsInclude = {
  owner: {
    select: publicUserSelect,
  },
  members: {
    include: {
      user: {
        select: publicUserSelect,
      },
    },
    orderBy: {
      joinedAt: 'asc',
    },
  },
  board: {
    include: {
      columns: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  },
} satisfies Prisma.ProjectInclude;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async findAll(user: AuthenticatedUser) {
    return this.prisma.project.findMany({
      where: this.projectAccessService.buildProjectAccessWhere(user),
      include: projectDetailsInclude,
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    await this.projectAccessService.ensureProjectAccess(user, id);
    await this.ensureProjectBoard(id);

    return this.prisma.project.findUniqueOrThrow({
      where: { id },
      include: projectDetailsInclude,
    });
  }

  async create(createProjectDto: CreateProjectDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: createProjectDto.ownerId },
      select: { id: true },
    });

    if (!owner) {
      throw new NotFoundException('Owner do projeto nao encontrado.');
    }

    const uniqueMemberIds = Array.from(
      new Set([...(createProjectDto.memberIds ?? []), createProjectDto.ownerId]),
    );

    await this.usersService.ensureUsersExist(uniqueMemberIds);

    const createdProject = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: createProjectDto.name,
          description: createProjectDto.description,
          deadline: normalizeDateInput(createProjectDto.deadline),
          ownerId: createProjectDto.ownerId,
          status: ProjectStatus.ACTIVE,
        },
      });

      await tx.projectMember.createMany({
        data: uniqueMemberIds.map((userId) => ({
          projectId: project.id,
          userId,
          role: userId === createProjectDto.ownerId ? ProjectRole.MANAGER : ProjectRole.MEMBER,
        })),
        skipDuplicates: true,
      });

      const board = await tx.board.create({
        data: {
          projectId: project.id,
        },
      });

      await tx.column.createMany({
        data: DEFAULT_BOARD_COLUMNS.map((title, position) => ({
          boardId: board.id,
          title,
          position,
        })),
      });

      return project;
    });

    return this.prisma.project.findUniqueOrThrow({
      where: { id: createdProject.id },
      include: projectDetailsInclude,
    });
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.projectAccessService.ensureProjectExists(id);

    if (updateProjectDto.ownerId) {
      await this.usersService.ensureUsersExist([updateProjectDto.ownerId]);
    }

    if (updateProjectDto.folderId) {
      const folder = await this.prisma.projectFolder.findUnique({
        where: { id: updateProjectDto.folderId },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException('Pasta nao encontrada.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: project.id },
        data: {
          name: updateProjectDto.name,
          description: updateProjectDto.description,
          deadline:
            updateProjectDto.deadline === undefined
              ? undefined
              : normalizeDateInput(updateProjectDto.deadline),
          status: updateProjectDto.status,
          ownerId: updateProjectDto.ownerId,
          folderId:
            updateProjectDto.folderId === undefined
              ? undefined
              : updateProjectDto.folderId,
        },
      });

      if (updateProjectDto.ownerId) {
        await tx.projectMember.upsert({
          where: {
            projectId_userId: {
              projectId: project.id,
              userId: updateProjectDto.ownerId,
            },
          },
          create: {
            projectId: project.id,
            userId: updateProjectDto.ownerId,
            role: ProjectRole.MANAGER,
          },
          update: {
            role: ProjectRole.MANAGER,
          },
        });
      }
    });

    return this.prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      include: projectDetailsInclude,
    });
  }

  async remove(id: string) {
    const project = await this.projectAccessService.ensureProjectExists(id);

    await this.prisma.project.delete({
      where: { id: project.id },
    });

    return { success: true };
  }

  async addMember(projectId: string, addProjectMemberDto: AddProjectMemberDto) {
    const project = await this.projectAccessService.ensureProjectExists(projectId);

    await this.usersService.ensureUsersExist([addProjectMemberDto.userId]);

    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: addProjectMemberDto.userId,
        },
      },
      select: { userId: true },
    });

    if (existingMember) {
      throw new ConflictException('Usuario ja participa deste projeto.');
    }

    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId: addProjectMemberDto.userId,
        role:
          addProjectMemberDto.userId === project.ownerId
            ? ProjectRole.MANAGER
            : (addProjectMemberDto.role ?? ProjectRole.MEMBER),
      },
      include: {
        user: {
          select: publicUserSelect,
        },
      },
    });
  }

  async removeMember(projectId: string, userId: string) {
    const project = await this.projectAccessService.ensureProjectExists(projectId);

    if (project.ownerId === userId) {
      throw new BadRequestException('O owner do projeto nao pode ser removido da equipe.');
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: {
        projectId: true,
        userId: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Membro do projeto nao encontrado.');
    }

    await this.prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    return { success: true };
  }

  private async ensureProjectBoard(projectId: string) {
    const existingBoard = await this.prisma.board.findUnique({
      where: { projectId },
      select: { id: true },
    });

    if (existingBoard) {
      return existingBoard.id;
    }

    const board = await this.prisma.$transaction(async (tx) => {
      const createdBoard = await tx.board.create({
        data: {
          projectId,
        },
      });

      await tx.column.createMany({
        data: DEFAULT_BOARD_COLUMNS.map((title, position) => ({
          boardId: createdBoard.id,
          title,
          position,
        })),
      });

      return createdBoard;
    });

    return board.id;
  }
}
