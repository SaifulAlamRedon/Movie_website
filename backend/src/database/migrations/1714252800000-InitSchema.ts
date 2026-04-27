import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1714252800000 implements MigrationInterface {
  name = 'InitSchema1714252800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "movies" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(255) NOT NULL,
        "description" text,
        "poster_url" varchar(500),
        "backdrop_url" varchar(500),
        "stream_url" varchar(1000),
        "download_url" varchar(1000),
        "content_type" varchar(20) NOT NULL DEFAULT 'movie',
        "category" varchar(120) NOT NULL DEFAULT 'Featured',
        "release_date" date,
        "rating" decimal(3,1) NOT NULL DEFAULT 0,
        "genre" text[] NOT NULL DEFAULT ARRAY[]::text[],
        "director" varchar(100),
        "cast" text[] NOT NULL DEFAULT ARRAY[]::text[],
        "runtime_minutes" integer,
        "language" varchar(10),
        "is_trending" boolean NOT NULL DEFAULT false,
        "is_featured" boolean NOT NULL DEFAULT false,
        "vote_count" bigint NOT NULL DEFAULT 0,
        "view_count" bigint NOT NULL DEFAULT 0,
        "download_count" bigint NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "email" varchar(160) NOT NULL UNIQUE,
        "avatar_url" varchar(500),
        "role" varchar(40) NOT NULL DEFAULT 'viewer',
        "subscription_plan" varchar(40) NOT NULL DEFAULT 'standard',
        "is_active" boolean NOT NULL DEFAULT true,
        "is_blocked" boolean NOT NULL DEFAULT false,
        "password_hash" varchar(255),
        "password_salt" varchar(255),
        "last_login_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "action" varchar(80) NOT NULL,
        "subject_type" varchar(80),
        "subject_id" varchar(120),
        "actor_user_id" varchar(120),
        "actor_name" varchar(160),
        "details" text,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_movies_title" ON "movies" ("title")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_activity_logs_created_at" ON "activity_logs" ("created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_last_login_at" ON "users" ("last_login_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_last_login_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_activity_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_movies_title"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "movies"`);
  }
}
