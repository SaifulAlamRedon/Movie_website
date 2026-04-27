import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { type Request, type Response } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

function findExistingPath(paths: string[]) {
  return paths.find((path) => existsSync(path));
}

function getAllowedOrigins() {
  return (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const uploadDir = join(process.cwd(), 'uploads');
  const frontendDistDir = findExistingPath([
    join(process.cwd(), 'frontend', 'dist'),
    join(process.cwd(), '..', 'frontend', 'dist'),
  ]);
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = getAllowedOrigins();

  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableCors({
    origin:
      allowedOrigins.length > 0
        ? allowedOrigins
        : isProduction
          ? false
          : 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.setGlobalPrefix('api');
  app.use('/uploads', express.static(uploadDir));

  if (frontendDistDir) {
    app.use(express.static(frontendDistDir));
    app.getHttpAdapter().getInstance().get(
      /^(?!\/api(?:\/|$)|\/uploads(?:\/|$)).*/,
      (_req: Request, res: Response) => {
        res.sendFile(join(frontendDistDir, 'index.html'));
      },
    );
  }

  const config = new DocumentBuilder()
    .setTitle('CinemaFlow API')
    .setDescription('Netflix-inspired streaming API with secure admin operations')
    .setVersion('1.0')
    .addTag('movies', 'Movie operations')
    .addTag('users', 'User operations')
    .addTag('auth', 'Admin authentication')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);

  console.log(`CinemaFlow API running on port ${port}`);
  console.log('Health check: /api/health');
  console.log('Swagger docs: /api/docs');
}

bootstrap();
