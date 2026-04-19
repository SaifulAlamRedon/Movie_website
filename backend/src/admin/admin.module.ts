import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from '../activity/entities/activity-log.entity';
import { AuthModule } from '../auth/auth.module';
import { Movie } from '../movies/entities/movie.entity';
import { User } from '../users/entities/user.entity';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Movie, User, ActivityLog]), AuthModule],
  controllers: [AdminController],
})
export class AdminModule {}
