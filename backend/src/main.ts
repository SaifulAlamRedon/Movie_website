import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const uploadDir = join(process.cwd(), 'uploads');

  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // Global validation pipe - auto-validates all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Strip unknown properties
      transform: true,         // Auto-transform types (string -> number etc.)
      forbidNonWhitelisted: false,
    }),
  );

  // Global API prefix
  app.setGlobalPrefix('api');

  // Public uploaded assets for thumbnails and video files
  app.use('/uploads', express.static(uploadDir));

  // Swagger API Documentation setup
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

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`\n🎬 CinemaFlow API running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger Docs:             http://localhost:${port}/api/docs\n`);
}

bootstrap();
