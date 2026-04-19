import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@cinemaflow.app' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SuperSecure123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class AdminSignupDto extends AdminLoginDto {
  @ApiProperty({ example: 'CinemaFlow Admin' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'cinemaflow-admin-setup' })
  @IsString()
  signupKey: string;

  @ApiPropertyOptional({ example: '/uploads/admin-avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
