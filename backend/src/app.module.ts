import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from './activity/activity.module';
import { ActivityLog } from './activity/entities/activity-log.entity';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/validate-env';
import { InitSchema1714252800000 } from './database/migrations/1714252800000-InitSchema';
import { HealthController } from './health.controller';
import { MoviesModule } from './movies/movies.module';
import { Movie } from './movies/entities/movie.entity';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'backend/.env'],
      validate: validateEnv,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
        const isProduction = nodeEnv === 'production';
        const databaseUrl = config.get<string>('DATABASE_URL');
        const shouldSynchronize =
          !isProduction && config.get<string>('DB_SYNCHRONIZE') !== 'false';
        const shouldRunMigrations =
          isProduction || config.get<string>('DB_RUN_MIGRATIONS') === 'true';

        return {
          type: 'postgres' as const,
          url: databaseUrl || undefined,
          host: databaseUrl ? undefined : config.get<string>('DB_HOST'),
          port: databaseUrl ? undefined : Number(config.get<string>('DB_PORT') ?? 5432),
          username: databaseUrl ? undefined : config.get<string>('DB_USERNAME'),
          password: databaseUrl ? undefined : config.get<string>('DB_PASSWORD'),
          database: databaseUrl ? undefined : config.get<string>('DB_NAME'),
          entities: [Movie, User, ActivityLog],
          migrations: [InitSchema1714252800000],
          migrationsRun: shouldRunMigrations,
          synchronize: shouldSynchronize,
          logging: nodeEnv === 'development',
        };
      },
    }),

    ActivityModule,
    AuthModule,
    AdminModule,
    MoviesModule,
    UsersModule,
  ],
})
export class AppModule {}
