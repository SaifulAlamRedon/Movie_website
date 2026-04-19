import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';

interface LogActivityInput {
  action: string;
  subjectType?: string | null;
  subjectId?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  details?: string | null;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepository: Repository<ActivityLog>,
  ) {}

  async log(input: LogActivityInput) {
    const activity = this.activityRepository.create({
      action: input.action,
      subjectType: input.subjectType ?? null,
      subjectId: input.subjectId ?? null,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      details: input.details ?? null,
    });

    return this.activityRepository.save(activity);
  }

  async getRecent(limit = 12) {
    return this.activityRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
