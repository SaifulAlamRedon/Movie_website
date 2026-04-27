import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Transformer to ensure Postgres decimal/bigint (returned as strings) 
 * are converted to numbers for JS/TS logic.
 */
export class ColumnNumericTransformer {
  to(data: number): number { return data; }
  from(data: string): number { return parseFloat(data); }
}

/**
 * Movie Entity
 * Maps directly to the `movies` table in PostgreSQL.
 * TypeORM will auto-create/sync this table in development mode.
 */
@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_movies_title')
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'poster_url' })
  posterUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'backdrop_url' })
  backdropUrl: string;

  @Column({ type: 'varchar', length: 1000, nullable: true, name: 'stream_url' })
  streamUrl: string;

  @Column({ type: 'varchar', length: 1000, nullable: true, name: 'download_url' })
  downloadUrl: string;

  @Column({ type: 'varchar', length: 20, default: 'movie', name: 'content_type' })
  contentType: string;

  @Column({ type: 'varchar', length: 120, default: 'Featured' })
  category: string;

  @Column({ type: 'date', nullable: true, name: 'release_date' })
  releaseDate: Date;

  // Rating stored as decimal, e.g. 8.5 out of 10
  @Column({ 
    type: 'decimal', 
    precision: 3, 
    scale: 1, 
    default: 0,
    transformer: new ColumnNumericTransformer() 
  })
  rating: number;

  // Stored as native PostgreSQL arrays so array queries work in the service.
  @Column('text', { array: true, default: [] })
  genre: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  director: string;

  @Column('text', { array: true, default: [] })
  cast: string[];

  // Runtime in minutes
  @Column({ type: 'integer', nullable: true, name: 'runtime_minutes' })
  runtimeMinutes: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  language: string;

  @Column({ type: 'boolean', default: false, name: 'is_trending' })
  isTrending: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_featured' })
  isFeatured: boolean;

  @Column({ 
    type: 'bigint', 
    default: 0, 
    name: 'vote_count',
    transformer: new ColumnNumericTransformer() 
  })
  voteCount: number;

  @Column({ 
    type: 'bigint', 
    default: 0, 
    name: 'view_count',
    transformer: new ColumnNumericTransformer() 
  })
  viewCount: number;

  @Column({ 
    type: 'bigint', 
    default: 0, 
    name: 'download_count',
    transformer: new ColumnNumericTransformer() 
  })
  downloadCount: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
