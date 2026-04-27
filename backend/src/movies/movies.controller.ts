import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import {
  CreateMovieDto,
  QueryMoviesDto,
  TrackMovieActivityDto,
  UpdateMovieDto,
} from './dto/movie.dto';
import { MoviesService } from './movies.service';

const uploadDirectory = join(process.cwd(), 'uploads');
const maxUploadSizeBytes = 250 * 1024 * 1024;

enum UploadAssetKind {
  Poster = 'poster',
  Backdrop = 'backdrop',
  Stream = 'stream',
  Download = 'download',
}

const uploadKindRules: Record<
  UploadAssetKind,
  { extensions: Set<string>; mimePatterns: RegExp[] }
> = {
  [UploadAssetKind.Poster]: {
    extensions: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']),
    mimePatterns: [/^image\//],
  },
  [UploadAssetKind.Backdrop]: {
    extensions: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']),
    mimePatterns: [/^image\//],
  },
  [UploadAssetKind.Stream]: {
    extensions: new Set(['.mp4', '.webm', '.mkv']),
    mimePatterns: [/^video\//],
  },
  [UploadAssetKind.Download]: {
    extensions: new Set(['.mp4', '.webm', '.mkv', '.zip']),
    mimePatterns: [
      /^video\//,
      /^application\/zip$/,
      /^application\/x-zip-compressed$/,
      /^application\/octet-stream$/,
    ],
  },
};

const uploadStorage = diskStorage({
  destination: (_req: any, _file: any, callback: any) => {
    if (!existsSync(uploadDirectory)) {
      mkdirSync(uploadDirectory, { recursive: true });
    }

    callback(null, uploadDirectory);
  },
  filename: (_req: any, file: any, callback: any) => {
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = extname(file.originalname) || '.bin';
    callback(null, `${uniquePrefix}${extension}`);
  },
});

const uploadInterceptorOptions = {
  storage: uploadStorage,
  limits: {
    fileSize: maxUploadSizeBytes,
  },
  fileFilter: (req: any, file: any, callback: any) => {
    const kind = req.params.kind as UploadAssetKind;
    const rules = uploadKindRules[kind];

    if (!rules) {
      callback(new BadRequestException('Unsupported upload kind'), false);
      return;
    }

    const extension = extname(file.originalname).toLowerCase();
    const extensionAllowed = rules.extensions.has(extension);
    const mimeAllowed = rules.mimePatterns.some((pattern) => pattern.test(file.mimetype));

    if (!extensionAllowed || !mimeAllowed) {
      callback(new BadRequestException(`Invalid file type for ${kind} upload`), false);
      return;
    }

    callback(null, true);
  },
};

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all content (movies and TV shows)' })
  findAll(@Query() query: QueryMoviesDto) {
    return this.moviesService.findAll(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search content by title, description, or category' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  search(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.moviesService.search(q, limit);
  }

  @Get('genres')
  @ApiOperation({ summary: 'Get all distinct genres' })
  getGenres() {
    return this.moviesService.getGenres();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all distinct content categories' })
  getCategories() {
    return this.moviesService.getCategories();
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending content' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTrending(@Query('limit') limit?: number) {
    return this.moviesService.getTrending(limit);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured content for hero banners and carousels' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getFeatured(@Query('limit') limit?: number) {
    return this.moviesService.getFeatured(limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single title by ID' })
  @ApiParam({ name: 'id', description: 'Content UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.moviesService.findOne(id);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a streaming view for analytics' })
  trackView(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TrackMovieActivityDto,
  ) {
    return this.moviesService.trackView(id, body);
  }

  @Post(':id/download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a download event for analytics' })
  trackDownload(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TrackMovieActivityDto,
  ) {
    return this.moviesService.trackDownload(id, body);
  }

  @Post('upload/:kind')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('file', uploadInterceptorOptions))
  @ApiOperation({ summary: 'Upload a video file or thumbnail for admin use' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'kind', enum: UploadAssetKind })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadAsset(
    @Param('kind', new ParseEnumPipe(UploadAssetKind)) kind: UploadAssetKind,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(`No ${kind} file was uploaded`);
    }

    const fileUrl = `/uploads/${file.filename}`;

    return this.moviesService.registerUpload(fileUrl, req.admin?.id);
  }

  @Post('seed')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed sample content (admin only)' })
  seed(@Req() req: any) {
    return this.moviesService.seed(req.admin?.id);
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Create a new title (admin only)' })
  create(@Body() createMovieDto: CreateMovieDto, @Req() req: any) {
    return this.moviesService.create(createMovieDto, req.admin?.id);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Update a title (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMovieDto: UpdateMovieDto,
    @Req() req: any,
  ) {
    return this.moviesService.update(id, updateMovieDto, req.admin?.id);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a title (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.moviesService.remove(id, req.admin?.id);
  }
}
