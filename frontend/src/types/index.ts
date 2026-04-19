export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  streamUrl: string;
  downloadUrl: string;
  contentType: 'movie' | 'tv';
  category: string;
  releaseDate: string;
  rating: number;
  genre: string[];
  director: string;
  cast: string[];
  runtimeMinutes: number;
  language: string;
  isTrending: boolean;
  isFeatured: boolean;
  voteCount: number;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface MovieQuery {
  q?: string;
  genre?: string;
  category?: string;
  contentType?: 'movie' | 'tv';
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
  trending?: boolean;
  featured?: boolean;
}

export interface MovieFormData {
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  streamUrl: string;
  downloadUrl: string;
  contentType: 'movie' | 'tv';
  category: string;
  releaseDate: string;
  rating: number;
  genre: string[];
  director: string;
  cast: string[];
  runtimeMinutes: number;
  language: string;
  isTrending: boolean;
  isFeatured: boolean;
  voteCount: number;
  viewCount: number;
  downloadCount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  subscriptionPlan: string;
  isActive: boolean;
  isBlocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProfile {
  id: string;
  name: string;
  avatarUrl: string;
  subscriptionPlan: string;
}

export interface UserQuery {
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
  isActive?: boolean;
  isBlocked?: boolean;
  role?: string;
}

export interface UserFormData {
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  subscriptionPlan: string;
  isActive: boolean;
  isBlocked: boolean;
}

export interface ActivityLog {
  id: string;
  action: string;
  subjectType: string | null;
  subjectId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  details: string | null;
  createdAt: string;
}

export interface AdminDashboard {
  metrics: {
    totalTitles: number;
    totalMovies: number;
    totalShows: number;
    totalUsers: number;
    blockedUsers: number;
    activeUsers: number;
    activeAdmins: number;
    totalViews: number;
    totalDownloads: number;
  };
  topContent: Array<{
    id: string;
    title: string;
    contentType: 'movie' | 'tv';
    category: string;
    viewCount: number;
    downloadCount: number;
    posterUrl: string;
  }>;
  recentActivity: ActivityLog[];
  recentlyActiveUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    lastLoginAt: string | null;
    isBlocked: boolean;
    isActive: boolean;
  }>;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  lastLoginAt: string | null;
}

export interface AdminAuthResponse {
  token: string;
  admin: AdminProfile;
}
