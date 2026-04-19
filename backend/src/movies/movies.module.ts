import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { Movie } from './entities/movie.entity';

/**
 * MoviesModule
 * Encapsulates all movie-related providers (controller + service + repository).
 * TypeOrmModule.forFeature registers the Movie entity in this module's scope.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Movie, User]), ActivityModule, AuthModule],
  controllers: [MoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule {}
