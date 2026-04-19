import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { ActivityService } from '../activity/activity.service';
import { User } from '../users/entities/user.entity';
import { AdminLoginDto, AdminSignupDto } from './dto/admin-auth.dto';

type AdminTokenPayload = {
  sub: string;
  role: string;
  exp: number;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly activityService: ActivityService,
  ) {}

  async signupAdmin(dto: AdminSignupDto) {
    if (dto.signupKey !== this.getSignupKey()) {
      throw new UnauthorizedException('Invalid admin signup key');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException(`A user with email "${dto.email}" already exists`);
    }

    const { salt, hash } = this.hashPassword(dto.password);

    const admin = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      avatarUrl: dto.avatarUrl ?? '',
      role: 'admin',
      subscriptionPlan: 'admin',
      isActive: true,
      isBlocked: false,
      passwordHash: hash,
      passwordSalt: salt,
      lastLoginAt: new Date(),
    });

    const saved = await this.userRepository.save(admin);

    await this.activityService.log({
      action: 'admin_signup',
      actorUserId: saved.id,
      actorName: saved.name,
      subjectType: 'auth',
      subjectId: saved.id,
      details: saved.email,
    });

    return this.createAuthResponse(saved);
  }

  async loginAdmin(dto: AdminLoginDto) {
    const admin = await this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.passwordHash', 'user.passwordSalt'])
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    if (!admin.passwordHash || !admin.passwordSalt || !this.verifyPassword(dto.password, admin.passwordSalt, admin.passwordHash)) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    if (admin.isBlocked || !admin.isActive) {
      throw new UnauthorizedException('Admin access is disabled for this account');
    }

    admin.lastLoginAt = new Date();
    const saved = await this.userRepository.save(admin);

    await this.activityService.log({
      action: 'admin_login',
      actorUserId: saved.id,
      actorName: saved.name,
      subjectType: 'auth',
      subjectId: saved.id,
      details: saved.email,
    });

    return this.createAuthResponse(saved);
  }

  async getAdminProfile(adminId: string) {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });

    if (!admin || admin.role !== 'admin' || admin.isBlocked || !admin.isActive) {
      throw new UnauthorizedException('Admin account is not available');
    }

    return this.serializeAdmin(admin);
  }

  async validateAdminToken(token: string) {
    const [payloadEncoded, signature] = token.split('.');

    if (!payloadEncoded || !signature) {
      throw new UnauthorizedException('Invalid admin token');
    }

    const expectedSignature = this.sign(payloadEncoded);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid admin token');
    }

    let payload: AdminTokenPayload;

    try {
      payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8')) as AdminTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid admin token');
    }

    if (payload.exp < Date.now()) {
      throw new UnauthorizedException('Admin token has expired');
    }

    const admin = await this.userRepository.findOne({ where: { id: payload.sub } });

    if (!admin || admin.role !== 'admin' || admin.isBlocked || !admin.isActive) {
      throw new UnauthorizedException('Admin token is no longer valid');
    }

    return this.serializeAdmin(admin);
  }

  private createAuthResponse(admin: User) {
    const payload: AdminTokenPayload = {
      sub: admin.id,
      role: admin.role,
      exp: Date.now() + 1000 * 60 * 60 * 12,
    };
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${payloadEncoded}.${this.sign(payloadEncoded)}`;

    return {
      token,
      admin: this.serializeAdmin(admin),
    };
  }

  private serializeAdmin(admin: User) {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      avatarUrl: admin.avatarUrl,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
    };
  }

  private getSignupKey() {
    return this.configService.get<string>('ADMIN_SIGNUP_KEY') ?? 'cinemaflow-admin-setup';
  }

  private getTokenSecret() {
    return this.configService.get<string>('ADMIN_TOKEN_SECRET') ?? 'cinemaflow-local-token-secret-change-me';
  }

  private sign(payloadEncoded: string) {
    return createHmac('sha256', this.getTokenSecret())
      .update(payloadEncoded)
      .digest('base64url');
  }

  private hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
    const hash = pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  private verifyPassword(password: string, salt: string, hash: string) {
    const testHash = pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
    return timingSafeEqual(Buffer.from(testHash), Buffer.from(hash));
  }
}
