import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BoardsModule } from './boards/boards.module';
import { CardsModule } from './cards/cards.module';
import { ChecklistModule } from './checklist/checklist.module';
import { ColumnsModule } from './columns/columns.module';
import { CommentsModule } from './comments/comments.module';
import { FoldersModule } from './folders/folders.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(8).required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().integer().min(1).max(65535).default(3000),
        SEED_ADMIN_NAME: Joi.string().optional(),
        SEED_ADMIN_EMAIL: Joi.string().email().optional(),
        SEED_ADMIN_PASSWORD: Joi.string().min(8).optional(),
      }),
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    BoardsModule,
    ColumnsModule,
    CardsModule,
    CommentsModule,
    ChecklistModule,
    FoldersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
