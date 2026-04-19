import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityService } from '../activity/activity.service';
import { User } from '../users/entities/user.entity';
import { Movie } from './entities/movie.entity';
import {
  CreateMovieDto,
  QueryMoviesDto,
  TrackMovieActivityDto,
  UpdateMovieDto,
} from './dto/movie.dto';

@Injectable()
export class MoviesService {
  private readonly sampleMediaUrls = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  ];

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly activityService: ActivityService,
  ) {}

  async findAll(query: QueryMoviesDto) {
    const {
      q,
      genre,
      category,
      contentType,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'DESC',
      trending,
      featured,
    } = query;

    const queryBuilder = this.movieRepository.createQueryBuilder('movie');

    if (q) {
      queryBuilder.where(
        `(
          movie.title ILIKE :search
          OR movie.description ILIKE :search
          OR movie.director ILIKE :search
          OR movie.category ILIKE :search
        )`,
        { search: `%${q}%` },
      );
    }

    if (genre) {
      queryBuilder.andWhere(':genre = ANY(movie.genre)', { genre });
    }

    if (category) {
      queryBuilder.andWhere('movie.category = :category', { category });
    }

    if (contentType) {
      queryBuilder.andWhere('movie.content_type = :contentType', { contentType });
    }

    if (trending !== undefined) {
      queryBuilder.andWhere('movie.is_trending = :trending', { trending });
    }

    if (featured !== undefined) {
      queryBuilder.andWhere('movie.is_featured = :featured', { featured });
    }

    const sortColumnMap: Record<string, keyof Movie | string> = {
      title: 'title',
      rating: 'rating',
      releaseDate: 'releaseDate',
      createdAt: 'createdAt',
      voteCount: 'voteCount',
      popularity: 'viewCount',
      viewCount: 'viewCount',
      downloadCount: 'downloadCount',
      category: 'category',
    };

    const safeSort = sortColumnMap[sortBy] ?? 'createdAt';

    queryBuilder
      .orderBy(`movie.${safeSort}`, order as 'ASC' | 'DESC')
      .addOrderBy('movie.vote_count', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [movies, total] = await queryBuilder.getManyAndCount();

    return {
      data: movies,
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

  async findOne(id: string): Promise<Movie> {
    const movie = await this.movieRepository.findOne({ where: { id } });

    if (!movie) {
      throw new NotFoundException(`Movie with ID "${id}" not found`);
    }

    return movie;
  }

  async search(q: string, limit = 10): Promise<Movie[]> {
    if (!q?.trim()) {
      return [];
    }

    return this.movieRepository
      .createQueryBuilder('movie')
      .where(
        `(
          movie.title ILIKE :search
          OR movie.description ILIKE :search
          OR movie.director ILIKE :search
          OR movie.category ILIKE :search
        )`,
        { search: `%${q}%` },
      )
      .orderBy('movie.view_count', 'DESC')
      .addOrderBy('movie.rating', 'DESC')
      .take(limit)
      .getMany();
  }

  async getGenres(): Promise<string[]> {
    const result = await this.movieRepository.query(
      `SELECT DISTINCT unnest(genre) AS genre FROM movies ORDER BY genre ASC`,
    );

    return result.map((row: { genre: string }) => row.genre);
  }

  async getCategories(): Promise<string[]> {
    const result = await this.movieRepository.query(
      `SELECT DISTINCT category FROM movies WHERE category IS NOT NULL ORDER BY category ASC`,
    );

    return result.map((row: { category: string }) => row.category);
  }

  async getTrending(limit = 10): Promise<Movie[]> {
    return this.movieRepository.find({
      where: { isTrending: true },
      order: { viewCount: 'DESC', rating: 'DESC' },
      take: limit,
    });
  }

  async getFeatured(limit = 8): Promise<Movie[]> {
    return this.movieRepository.find({
      where: { isFeatured: true },
      order: { viewCount: 'DESC', rating: 'DESC' },
      take: limit,
    });
  }

  async create(createMovieDto: CreateMovieDto, actorUserId?: string): Promise<Movie> {
    const movie = this.movieRepository.create(createMovieDto);
    const saved = await this.movieRepository.save(movie);

    await this.activityService.log({
      action: 'movie_created',
      actorUserId: actorUserId ?? null,
      subjectType: 'movie',
      subjectId: saved.id,
      details: saved.title,
    });

    return saved;
  }

  async update(id: string, updateMovieDto: UpdateMovieDto, actorUserId?: string): Promise<Movie> {
    const movie = await this.findOne(id);
    const updated = this.movieRepository.merge(movie, updateMovieDto);
    const saved = await this.movieRepository.save(updated);

    await this.activityService.log({
      action: 'movie_updated',
      actorUserId: actorUserId ?? null,
      subjectType: 'movie',
      subjectId: saved.id,
      details: saved.title,
    });

    return saved;
  }

  async remove(id: string, actorUserId?: string): Promise<{ message: string }> {
    const movie = await this.findOne(id);
    await this.movieRepository.remove(movie);

    await this.activityService.log({
      action: 'movie_deleted',
      actorUserId: actorUserId ?? null,
      subjectType: 'movie',
      subjectId: movie.id,
      details: movie.title,
    });

    return { message: `Movie "${movie.title}" deleted successfully` };
  }

  async trackView(id: string, body: TrackMovieActivityDto = {}) {
    const movie = await this.findOne(id);
    movie.viewCount = Number(movie.viewCount ?? 0) + 1;
    await this.movieRepository.save(movie);

    const actor = await this.resolvePublicActor(body.userId);
    await this.activityService.log({
      action: 'content_viewed',
      actorUserId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      subjectType: 'movie',
      subjectId: movie.id,
      details: movie.title,
    });

    return {
      message: 'View recorded',
      streamUrl: movie.streamUrl,
      viewCount: movie.viewCount,
    };
  }

  async trackDownload(id: string, body: TrackMovieActivityDto = {}) {
    const movie = await this.findOne(id);

    if (!movie.downloadUrl && !movie.streamUrl) {
      throw new BadRequestException('Download is not enabled for this title');
    }

    movie.downloadCount = Number(movie.downloadCount ?? 0) + 1;
    await this.movieRepository.save(movie);

    const actor = await this.resolvePublicActor(body.userId);
    await this.activityService.log({
      action: 'content_downloaded',
      actorUserId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      subjectType: 'movie',
      subjectId: movie.id,
      details: movie.title,
    });

    return {
      message: 'Download recorded',
      downloadUrl: movie.downloadUrl || movie.streamUrl,
      downloadCount: movie.downloadCount,
    };
  }

  async registerUpload(filePath: string, actorUserId?: string) {
    await this.activityService.log({
      action: 'asset_uploaded',
      actorUserId: actorUserId ?? null,
      subjectType: 'upload',
      subjectId: filePath,
      details: filePath,
    });

    return { url: filePath };
  }

  async seed(actorUserId?: string): Promise<{ message: string; count: number }> {
    const sampleContent = this.buildSampleContent();
    const existingMovies = await this.movieRepository.find();
    const existingByTitle = new Map(
      existingMovies.map((movie) => [movie.title, movie]),
    );

    const moviesToInsert: CreateMovieDto[] = [];
    let repairedCount = 0;

    for (const sampleMovie of sampleContent) {
      const existingMovie = existingByTitle.get(sampleMovie.title);

      if (!existingMovie) {
        moviesToInsert.push(sampleMovie);
        continue;
      }

      const repairPayload: Partial<Movie> = {};

      if (sampleMovie.genre?.length && !existingMovie.genre?.length) {
        repairPayload.genre = sampleMovie.genre;
      }

      if (sampleMovie.cast?.length && !existingMovie.cast?.length) {
        repairPayload.cast = sampleMovie.cast;
      }

      if (sampleMovie.streamUrl && !existingMovie.streamUrl) {
        repairPayload.streamUrl = sampleMovie.streamUrl;
      }

      if (sampleMovie.downloadUrl && !existingMovie.downloadUrl) {
        repairPayload.downloadUrl = sampleMovie.downloadUrl;
      }

      if (sampleMovie.category && !existingMovie.category) {
        repairPayload.category = sampleMovie.category;
      }

      if (sampleMovie.contentType && !existingMovie.contentType) {
        repairPayload.contentType = sampleMovie.contentType;
      }

      if (sampleMovie.posterUrl && !existingMovie.posterUrl) {
        repairPayload.posterUrl = sampleMovie.posterUrl;
      }

      if (sampleMovie.backdropUrl && !existingMovie.backdropUrl) {
        repairPayload.backdropUrl = sampleMovie.backdropUrl;
      }

      if (sampleMovie.viewCount && !Number(existingMovie.viewCount)) {
        repairPayload.viewCount = sampleMovie.viewCount;
      }

      if (sampleMovie.downloadCount && !Number(existingMovie.downloadCount)) {
        repairPayload.downloadCount = sampleMovie.downloadCount;
      }

      if (Object.keys(repairPayload).length > 0) {
        await this.movieRepository.update(existingMovie.id, repairPayload);
        repairedCount += 1;
      }
    }

    let insertedCount = 0;
    if (moviesToInsert.length > 0) {
      const movies = this.movieRepository.create(moviesToInsert);
      const saved = await this.movieRepository.save(movies);
      insertedCount = saved.length;
    }

    const totalCount = await this.movieRepository.count();

    if (insertedCount === 0 && repairedCount === 0) {
      return { message: 'Database already seeded', count: totalCount };
    }

    await this.activityService.log({
      action: 'movie_seeded',
      actorUserId: actorUserId ?? null,
      subjectType: 'movie',
      details: `Inserted ${insertedCount}, repaired ${repairedCount}`,
    });

    return {
      message: `Seed completed: inserted ${insertedCount}, repaired ${repairedCount}`,
      count: totalCount,
    };
  }

  private async resolvePublicActor(userId?: string) {
    if (!userId) {
      return null;
    }

    return this.userRepository.findOne({
      where: {
        id: userId,
        isActive: true,
        isBlocked: false,
      },
    });
  }

  private buildSampleContent(): CreateMovieDto[] {
    const entries: Array<CreateMovieDto & { mediaIndex: number }> = [
      {
        title: 'Dune: Part Two',
        description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against those who destroyed his family.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
        contentType: 'movie',
        category: 'Sci-Fi Epic',
        releaseDate: '2024-03-01',
        rating: 8.5,
        genre: ['Sci-Fi', 'Adventure', 'Drama'],
        director: 'Denis Villeneuve',
        cast: ['Timothee Chalamet', 'Zendaya', 'Rebecca Ferguson'],
        runtimeMinutes: 167,
        language: 'en',
        isTrending: true,
        isFeatured: true,
        voteCount: 1823400,
        viewCount: 920000,
        downloadCount: 210000,
        mediaIndex: 0,
      },
      {
        title: 'Oppenheimer',
        description: 'The story of J. Robert Oppenheimer and the development of the atomic bomb during World War II.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg',
        contentType: 'movie',
        category: 'Award Winners',
        releaseDate: '2023-07-21',
        rating: 8.9,
        genre: ['Drama', 'History', 'Thriller'],
        director: 'Christopher Nolan',
        cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon'],
        runtimeMinutes: 180,
        language: 'en',
        isTrending: true,
        isFeatured: true,
        voteCount: 4521300,
        viewCount: 880000,
        downloadCount: 198000,
        mediaIndex: 1,
      },
      {
        title: 'Poor Things',
        description: 'Bella Baxter explores a dazzling and dangerous new world while redefining her place in it.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXIbrazAGpFPbCL.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/kElqSgFgekMTMNOORkk5cNMvMRS.jpg',
        contentType: 'movie',
        category: 'Indie Spotlight',
        releaseDate: '2023-12-08',
        rating: 8.0,
        genre: ['Comedy', 'Drama', 'Fantasy', 'Romance'],
        director: 'Yorgos Lanthimos',
        cast: ['Emma Stone', 'Mark Ruffalo', 'Willem Dafoe'],
        runtimeMinutes: 141,
        language: 'en',
        isFeatured: true,
        voteCount: 985600,
        viewCount: 410000,
        downloadCount: 72000,
        mediaIndex: 2,
      },
      {
        title: 'The Last of Us',
        description: 'A hardened survivor and a fearless teenager travel across a ravaged America after the collapse of society.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/9WxhJU5nGnJYay7HfOOOVq0PtwX.jpg',
        contentType: 'tv',
        category: 'Binge Worthy',
        releaseDate: '2023-01-15',
        rating: 8.8,
        genre: ['Drama', 'Sci-Fi', 'Thriller'],
        director: 'Craig Mazin',
        cast: ['Pedro Pascal', 'Bella Ramsey', 'Anna Torv'],
        runtimeMinutes: 60,
        language: 'en',
        isTrending: true,
        isFeatured: true,
        voteCount: 1892200,
        viewCount: 1210000,
        downloadCount: 265000,
        mediaIndex: 3,
      },
      {
        title: 'Stranger Things',
        description: 'Mysteries unfold in Hawkins as friends confront creatures and conspiracies from another dimension.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
        contentType: 'tv',
        category: 'Top 10',
        releaseDate: '2016-07-15',
        rating: 8.6,
        genre: ['Drama', 'Fantasy', 'Sci-Fi'],
        director: 'The Duffer Brothers',
        cast: ['Millie Bobby Brown', 'Finn Wolfhard', 'David Harbour'],
        runtimeMinutes: 51,
        language: 'en',
        isTrending: true,
        voteCount: 1543300,
        viewCount: 1430000,
        downloadCount: 312000,
        mediaIndex: 0,
      },
      {
        title: 'Dark',
        description: 'Four families begin a desperate hunt for answers when children vanish in a small German town.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/5LoYJYbDL2LQHhQlU3vG5m4BE8Y.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/1KQfI8k4e7xGICM9N0MblfC3fDy.jpg',
        contentType: 'tv',
        category: 'Mind Benders',
        releaseDate: '2017-12-01',
        rating: 8.7,
        genre: ['Crime', 'Drama', 'Mystery'],
        director: 'Baran bo Odar',
        cast: ['Louis Hofmann', 'Karoline Eichhorn', 'Lisa Vicari'],
        runtimeMinutes: 55,
        language: 'de',
        voteCount: 945100,
        viewCount: 680000,
        downloadCount: 118000,
        mediaIndex: 1,
      },
      {
        title: 'Spider-Man: Across the Spider-Verse',
        description: 'Miles Morales catapults across the multiverse and confronts the meaning of heroism.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
        contentType: 'movie',
        category: 'Family Night',
        releaseDate: '2023-06-02',
        rating: 8.7,
        genre: ['Animation', 'Action', 'Adventure', 'Sci-Fi'],
        director: 'Joaquim Dos Santos',
        cast: ['Shameik Moore', 'Hailee Steinfeld', 'Oscar Isaac'],
        runtimeMinutes: 140,
        language: 'en',
        isTrending: true,
        isFeatured: true,
        voteCount: 3789100,
        viewCount: 1160000,
        downloadCount: 242000,
        mediaIndex: 2,
      },
      {
        title: 'The Crown',
        description: 'A dramatic portrait of the British royal family across decades of triumph, pressure, and scandal.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/1M876KPjulVwppEpldhdc8V4o68.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/z0A8N0jjt0qH32Wdh4YZQz1P5dS.jpg',
        contentType: 'tv',
        category: 'Prestige TV',
        releaseDate: '2016-11-04',
        rating: 8.3,
        genre: ['Drama', 'History'],
        director: 'Peter Morgan',
        cast: ['Imelda Staunton', 'Elizabeth Debicki', 'Dominic West'],
        runtimeMinutes: 57,
        language: 'en',
        voteCount: 802300,
        viewCount: 520000,
        downloadCount: 92000,
        mediaIndex: 3,
      },
      {
        title: 'Godzilla Minus One',
        description: 'Postwar Japan must confront a massive nuclear-powered creature while rebuilding from ruin.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/hkxxMIGaiCTmrEArK7J56JTKUlB.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/nHf61UzkfFno5X1ofIhugCPus2R.jpg',
        contentType: 'movie',
        category: 'Monster Hits',
        releaseDate: '2023-12-01',
        rating: 7.9,
        genre: ['Action', 'Sci-Fi', 'Drama'],
        director: 'Takashi Yamazaki',
        cast: ['Ryunosuke Kamiki', 'Minami Hamabe', 'Yuki Yamada'],
        runtimeMinutes: 125,
        language: 'ja',
        isTrending: true,
        voteCount: 765400,
        viewCount: 690000,
        downloadCount: 121000,
        mediaIndex: 0,
      },
      {
        title: 'The Bear',
        description: 'A fine-dining chef returns home to run the family sandwich shop while chaos and grief simmer everywhere.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg',
        backdropUrl: 'https://image.tmdb.org/t/p/original/gc6nM8gFNGsN0c2vv3w1c6PA2Zz.jpg',
        contentType: 'tv',
        category: 'Critics Choice',
        releaseDate: '2022-06-23',
        rating: 8.4,
        genre: ['Comedy', 'Drama'],
        director: 'Christopher Storer',
        cast: ['Jeremy Allen White', 'Ayo Edebiri', 'Ebon Moss-Bachrach'],
        runtimeMinutes: 36,
        language: 'en',
        voteCount: 612400,
        viewCount: 480000,
        downloadCount: 73000,
        mediaIndex: 1,
      },
    ];

    return entries.map(({ mediaIndex, ...movie }) => {
      const mediaUrl = this.sampleMediaUrls[mediaIndex % this.sampleMediaUrls.length];
      return {
        ...movie,
        streamUrl: movie.streamUrl ?? mediaUrl,
        downloadUrl: movie.downloadUrl ?? mediaUrl,
      };
    });
  }
}
