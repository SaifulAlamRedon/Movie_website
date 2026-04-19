import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMovieDto {
  @ApiProperty({ example: 'Dune: Part Two' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Paul Atreides unites...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '/uploads/poster.jpg' })
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @ApiPropertyOptional({ example: '/uploads/backdrop.jpg' })
  @IsOptional()
  @IsString()
  backdropUrl?: string;

  @ApiPropertyOptional({ example: '/uploads/trailer.mp4' })
  @IsOptional()
  @IsString()
  streamUrl?: string;

  @ApiPropertyOptional({ example: '/uploads/download.mp4' })
  @IsOptional()
  @IsString()
  downloadUrl?: string;

  @ApiPropertyOptional({ example: 'movie', enum: ['movie', 'tv'] })
  @IsOptional()
  @IsIn(['movie', 'tv'])
  contentType?: string;

  @ApiPropertyOptional({ example: 'Sci-Fi Epic' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '2024-03-01' })
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional({ example: 8.5, minimum: 0, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  rating?: number;

  @ApiPropertyOptional({ example: ['Sci-Fi', 'Adventure'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genre?: string[];

  @ApiPropertyOptional({ example: 'Denis Villeneuve' })
  @IsOptional()
  @IsString()
  director?: string;

  @ApiPropertyOptional({ example: ['Timothee Chalamet', 'Zendaya'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cast?: string[];

  @ApiPropertyOptional({ example: 167 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  runtimeMinutes?: number;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isTrending?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: 1823400 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  voteCount?: number;

  @ApiPropertyOptional({ example: 240000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  viewCount?: number;

  @ApiPropertyOptional({ example: 83000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  downloadCount?: number;
}

export class UpdateMovieDto extends PartialType(CreateMovieDto) {}

export class QueryMoviesDto {
  @ApiPropertyOptional({ description: 'Search by title, description, or director' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by genre', example: 'Action' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ description: 'Filter by category', example: 'Binge Worthy' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by content type', enum: ['movie', 'tv'] })
  @IsOptional()
  @IsIn(['movie', 'tv'])
  contentType?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field', example: 'popularity' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: 'Filter trending titles' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  trending?: boolean;

  @ApiPropertyOptional({ description: 'Filter featured titles' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;
}

export class TrackMovieActivityDto {
  @ApiPropertyOptional({ description: 'Optional public profile ID to attach to the activity log' })
  @IsOptional()
  @IsString()
  userId?: string;
}
