import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../activity/entities/activity-log.entity';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { Movie } from '../movies/entities/movie.entity';
import { User } from '../users/entities/user.entity';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ActivityLog)
    private readonly activityRepository: Repository<ActivityLog>,
  ) {}

  @Get('dashboard')
  async getDashboard() {
    const [
      totalTitles,
      totalMovies,
      totalShows,
      totalUsers,
      blockedUsers,
      activeUsers,
      activeAdmins,
      totalsRow,
      movieRows,
      recentActivity,
      recentlyActiveUsers,
    ] = await Promise.all([
      this.movieRepository.count(),
      this.movieRepository.count({ where: { contentType: 'movie' } }),
      this.movieRepository.count({ where: { contentType: 'tv' } }),
      this.userRepository.count(),
      this.userRepository.count({ where: { isBlocked: true } }),
      this.userRepository.count({ where: { isActive: true, isBlocked: false, role: 'viewer' } }),
      this.userRepository.count({ where: { isActive: true, isBlocked: false, role: 'admin' } }),
      this.movieRepository
        .createQueryBuilder('movie')
        .select('COALESCE(SUM(movie.view_count), 0)', 'totalViews')
        .addSelect('COALESCE(SUM(movie.download_count), 0)', 'totalDownloads')
        .getRawOne<{ totalViews: string; totalDownloads: string }>(),
      this.movieRepository.find({ order: { viewCount: 'DESC' }, take: 8 }),
      this.activityRepository.find({ order: { createdAt: 'DESC' }, take: 12 }),
      this.userRepository.find({ order: { lastLoginAt: 'DESC', updatedAt: 'DESC' }, take: 8 }),
    ]);

    const totalViews = Number(totalsRow?.totalViews ?? 0);
    const totalDownloads = Number(totalsRow?.totalDownloads ?? 0);

    return {
      metrics: {
        totalTitles,
        totalMovies,
        totalShows,
        totalUsers,
        blockedUsers,
        activeUsers,
        activeAdmins,
        totalViews,
        totalDownloads,
      },
      topContent: movieRows.map((movie) => ({
        id: movie.id,
        title: movie.title,
        contentType: movie.contentType,
        category: movie.category,
        viewCount: Number(movie.viewCount ?? 0),
        downloadCount: Number(movie.downloadCount ?? 0),
        posterUrl: movie.posterUrl,
      })),
      recentActivity,
      recentlyActiveUsers: recentlyActiveUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
        isBlocked: user.isBlocked,
        isActive: user.isActive,
      })),
    };
  }
}
