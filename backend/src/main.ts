import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  app.enableCors({
    origin: [
      'http://localhost',
      'http://localhost:80',
      'http://localhost:5173',
      'http://127.0.0.1',
      'http://127.0.0.1:80',
      'http://127.0.0.1:5173',
    ],
  });

  const port = Number(process.env.PORT ?? 3000);
  const prismaService = app.get(PrismaService);

  await prismaService.enableShutdownHooks(app);

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
