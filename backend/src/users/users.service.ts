import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityService } from '../activity/activity.service';
import {
  CreateUserDto,
  QueryUsersDto,
  UpdateUserDto,
} from './dto/user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly activityService: ActivityService,
  ) {}

  async findAll(query: QueryUsersDto) {
    const {
      q,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      order = 'DESC',
      isActive,
      isBlocked,
      role,
    } = query;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (q) {
      queryBuilder.where(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${q}%` },
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.is_active = :isActive', { isActive });
    }

    if (isBlocked !== undefined) {
      queryBuilder.andWhere('user.is_blocked = :isBlocked', { isBlocked });
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    const allowedSortColumns = ['name', 'email', 'createdAt', 'updatedAt', 'lastLoginAt', 'subscriptionPlan'];
    const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';

    queryBuilder
      .orderBy(`user.${safeSort}`, order as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      data: users,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async getPublicProfiles() {
    const users = await this.userRepository.find({
      where: {
        role: 'viewer',
        isActive: true,
        isBlocked: false,
      },
      order: { name: 'ASC' },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      subscriptionPlan: user.subscriptionPlan,
    }));
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto, actorUserId?: string): Promise<User> {
    await this.ensureEmailAvailable(createUserDto.email);

    const user = this.userRepository.create({
      role: 'viewer',
      subscriptionPlan: 'standard',
      isActive: true,
      isBlocked: false,
      ...createUserDto,
    });

    const saved = await this.userRepository.save(user);

    await this.activityService.log({
      action: 'user_created',
      actorUserId: actorUserId ?? null,
      subjectType: 'user',
      subjectId: saved.id,
      details: saved.email,
    });

    return saved;
  }

  async update(id: string, updateUserDto: UpdateUserDto, actorUserId?: string): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      await this.ensureEmailAvailable(updateUserDto.email, id);
    }

    const updated = this.userRepository.merge(user, updateUserDto);
    const saved = await this.userRepository.save(updated);

    await this.activityService.log({
      action: 'user_updated',
      actorUserId: actorUserId ?? null,
      subjectType: 'user',
      subjectId: saved.id,
      details: saved.email,
    });

    return saved;
  }

  async setBlocked(id: string, isBlocked: boolean, actorUserId?: string): Promise<User> {
    const user = await this.findOne(id);
    user.isBlocked = isBlocked;
    const saved = await this.userRepository.save(user);

    await this.activityService.log({
      action: isBlocked ? 'user_blocked' : 'user_unblocked',
      actorUserId: actorUserId ?? null,
      subjectType: 'user',
      subjectId: saved.id,
      details: saved.email,
    });

    return saved;
  }

  async remove(id: string, actorUserId?: string): Promise<{ message: string }> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);

    await this.activityService.log({
      action: 'user_deleted',
      actorUserId: actorUserId ?? null,
      subjectType: 'user',
      subjectId: user.id,
      details: user.email,
    });

    return { message: `User "${user.name}" deleted successfully` };
  }

  async seed(actorUserId?: string): Promise<{ message: string; count: number }> {
    const sampleUsers: CreateUserDto[] = [
      {
        name: 'Ava Thompson',
        email: 'ava@cinemaflow.app',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
        role: 'viewer',
        subscriptionPlan: 'premium',
        isActive: true,
        isBlocked: false,
      },
      {
        name: 'Marcus Reed',
        email: 'marcus@cinemaflow.app',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        role: 'viewer',
        subscriptionPlan: 'family',
        isActive: true,
        isBlocked: false,
      },
      {
        name: 'Nadia Patel',
        email: 'nadia.viewer@cinemaflow.app',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
        role: 'viewer',
        subscriptionPlan: 'premium',
        isActive: true,
        isBlocked: false,
      },
    ];

    const existingUsers = await this.userRepository.find();
    const existingByEmail = new Map(
      existingUsers.map((user) => [user.email.toLowerCase(), user]),
    );

    const usersToInsert: CreateUserDto[] = [];
    let repairedCount = 0;

    for (const sampleUser of sampleUsers) {
      const existingUser = existingByEmail.get(sampleUser.email.toLowerCase());

      if (!existingUser) {
        usersToInsert.push(sampleUser);
        continue;
      }

      const repairPayload: Partial<User> = {};

      if (sampleUser.avatarUrl && !existingUser.avatarUrl) {
        repairPayload.avatarUrl = sampleUser.avatarUrl;
      }

      if (sampleUser.subscriptionPlan && !existingUser.subscriptionPlan) {
        repairPayload.subscriptionPlan = sampleUser.subscriptionPlan;
      }

      if (sampleUser.role && existingUser.role !== sampleUser.role && existingUser.role !== 'admin') {
        repairPayload.role = sampleUser.role;
      }

      if (sampleUser.isActive !== undefined && existingUser.isActive !== sampleUser.isActive) {
        repairPayload.isActive = sampleUser.isActive;
      }

      if (sampleUser.isBlocked !== undefined && existingUser.isBlocked !== sampleUser.isBlocked) {
        repairPayload.isBlocked = sampleUser.isBlocked;
      }

      if (Object.keys(repairPayload).length > 0) {
        await this.userRepository.update(existingUser.id, repairPayload);
        repairedCount += 1;
      }
    }

    let insertedCount = 0;
    if (usersToInsert.length > 0) {
      const users = this.userRepository.create(usersToInsert);
      const saved = await this.userRepository.save(users);
      insertedCount = saved.length;
    }

    const totalCount = await this.userRepository.count();

    if (insertedCount === 0 && repairedCount === 0) {
      return { message: 'Users already seeded', count: totalCount };
    }

    await this.activityService.log({
      action: 'user_seeded',
      actorUserId: actorUserId ?? null,
      subjectType: 'user',
      details: `Inserted ${insertedCount}, repaired ${repairedCount}`,
    });

    return {
      message: `User seed completed: inserted ${insertedCount}, repaired ${repairedCount}`,
      count: totalCount,
    };
  }

  private async ensureEmailAvailable(email: string, excludeUserId?: string) {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser && existingUser.id !== excludeUserId) {
      throw new ConflictException(`A user with email "${email}" already exists`);
    }
  }
}
