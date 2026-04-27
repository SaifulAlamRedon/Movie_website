import axios from 'axios';
import type {
  AdminAuthResponse,
  AdminDashboard,
  AdminProfile,
  Movie,
  MovieFormData,
  MovieQuery,
  PaginatedResponse,
  PublicProfile,
  User,
  UserFormData,
  UserQuery,
} from '../types';

export const ADMIN_TOKEN_KEY = 'cinemaflow_admin_token';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '') || '/api';
const apiOrigin = /^https?:\/\//i.test(apiBaseUrl)
  ? new URL(apiBaseUrl).origin
  : '';

export const adminTokenStorage = {
  get: () => window.localStorage.getItem(ADMIN_TOKEN_KEY),
  set: (token: string) => window.localStorage.setItem(ADMIN_TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(ADMIN_TOKEN_KEY),
};

function normalizeAssetUrl(url?: string | null) {
  if (!url) {
    return '';
  }

  if (/^(?:https?:)?\/\//i.test(url) || url.startsWith('data:') || !url.startsWith('/')) {
    return url;
  }

  return apiOrigin ? `${apiOrigin}${url}` : url;
}

function normalizeMovie(movie: Movie): Movie {
  return {
    ...movie,
    posterUrl: normalizeAssetUrl(movie.posterUrl),
    backdropUrl: normalizeAssetUrl(movie.backdropUrl),
    streamUrl: normalizeAssetUrl(movie.streamUrl),
    downloadUrl: normalizeAssetUrl(movie.downloadUrl),
  };
}

function normalizeUser(user: User): User {
  return {
    ...user,
    avatarUrl: normalizeAssetUrl(user.avatarUrl),
  };
}

function normalizePublicProfile(profile: PublicProfile): PublicProfile {
  return {
    ...profile,
    avatarUrl: normalizeAssetUrl(profile.avatarUrl),
  };
}

function normalizeAdminProfile(admin: AdminProfile): AdminProfile {
  return {
    ...admin,
    avatarUrl: normalizeAssetUrl(admin.avatarUrl),
  };
}

function normalizePaginatedMovies(
  response: PaginatedResponse<Movie>,
): PaginatedResponse<Movie> {
  return {
    ...response,
    data: response.data.map(normalizeMovie),
  };
}

function normalizePaginatedUsers(
  response: PaginatedResponse<User>,
): PaginatedResponse<User> {
  return {
    ...response,
    data: response.data.map(normalizeUser),
  };
}

function normalizeAdminDashboard(dashboard: AdminDashboard): AdminDashboard {
  return {
    ...dashboard,
    topContent: dashboard.topContent.map((movie) => ({
      ...movie,
      posterUrl: normalizeAssetUrl(movie.posterUrl),
    })),
  };
}

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = adminTokenStorage.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = Array.isArray(error.response?.data?.message)
      ? error.response.data.message.join(', ')
      : error.response?.data?.message || error.message || 'An error occurred';

    return Promise.reject(new Error(message));
  },
);

export const moviesApi = {
  getAll: async (query: MovieQuery = {}): Promise<PaginatedResponse<Movie>> => {
    const params = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
    );
    const { data } = await api.get<PaginatedResponse<Movie>>('/movies', { params });
    return normalizePaginatedMovies(data);
  },

  getById: async (id: string): Promise<Movie> => {
    const { data } = await api.get<Movie>(`/movies/${id}`);
    return normalizeMovie(data);
  },

  search: async (q: string, limit = 8): Promise<Movie[]> => {
    const { data } = await api.get<Movie[]>('/movies/search', {
      params: { q, limit },
    });
    return data.map(normalizeMovie);
  },

  getGenres: async (): Promise<string[]> => {
    const { data } = await api.get<string[]>('/movies/genres');
    return data;
  },

  getCategories: async (): Promise<string[]> => {
    const { data } = await api.get<string[]>('/movies/categories');
    return data;
  },

  getTrending: async (limit = 10): Promise<Movie[]> => {
    const { data } = await api.get<Movie[]>('/movies/trending', {
      params: { limit },
    });
    return data.map(normalizeMovie);
  },

  getFeatured: async (limit = 8): Promise<Movie[]> => {
    const { data } = await api.get<Movie[]>('/movies/featured', {
      params: { limit },
    });
    return data.map(normalizeMovie);
  },

  trackView: async (id: string, userId?: string) => {
    const { data } = await api.post(`/movies/${id}/view`, userId ? { userId } : {});
    return {
      ...data,
      streamUrl: normalizeAssetUrl(data.streamUrl),
    } as { message: string; streamUrl: string | null; viewCount: number };
  },

  trackDownload: async (id: string, userId?: string) => {
    const { data } = await api.post(`/movies/${id}/download`, userId ? { userId } : {});
    return {
      ...data,
      downloadUrl: normalizeAssetUrl(data.downloadUrl),
    } as { message: string; downloadUrl: string; downloadCount: number };
  },

  uploadFile: async (kind: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<{ url: string }>(`/movies/upload/${kind}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return {
      ...data,
      url: normalizeAssetUrl(data.url),
    };
  },

  create: async (body: MovieFormData): Promise<Movie> => {
    const { data } = await api.post<Movie>('/movies', body);
    return normalizeMovie(data);
  },

  update: async (id: string, body: Partial<MovieFormData>): Promise<Movie> => {
    const { data } = await api.patch<Movie>(`/movies/${id}`, body);
    return normalizeMovie(data);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/movies/${id}`);
    return data;
  },

  seed: async (): Promise<{ message: string; count: number }> => {
    const { data } = await api.post('/movies/seed');
    return data;
  },
};

export const usersApi = {
  getProfiles: async (): Promise<PublicProfile[]> => {
    const { data } = await api.get<PublicProfile[]>('/users/profiles');
    return data.map(normalizePublicProfile);
  },

  getAll: async (query: UserQuery = {}): Promise<PaginatedResponse<User>> => {
    const params = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
    );
    const { data } = await api.get<PaginatedResponse<User>>('/users', { params });
    return normalizePaginatedUsers(data);
  },

  create: async (body: UserFormData): Promise<User> => {
    const { data } = await api.post<User>('/users', body);
    return normalizeUser(data);
  },

  update: async (id: string, body: Partial<UserFormData>): Promise<User> => {
    const { data } = await api.patch<User>(`/users/${id}`, body);
    return normalizeUser(data);
  },

  setBlocked: async (id: string, isBlocked: boolean): Promise<User> => {
    const { data } = await api.patch<User>(`/users/${id}/block`, { isBlocked });
    return normalizeUser(data);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/users/${id}`);
    return data;
  },

  seed: async (): Promise<{ message: string; count: number }> => {
    const { data } = await api.post('/users/seed');
    return data;
  },
};

export const authApi = {
  signup: async (body: {
    name: string;
    email: string;
    password: string;
    signupKey: string;
    avatarUrl?: string;
  }): Promise<AdminAuthResponse> => {
    const { data } = await api.post<AdminAuthResponse>('/auth/admin/signup', body);
    return {
      ...data,
      admin: normalizeAdminProfile(data.admin),
    };
  },

  login: async (body: { email: string; password: string }): Promise<AdminAuthResponse> => {
    const { data } = await api.post<AdminAuthResponse>('/auth/admin/login', body);
    return {
      ...data,
      admin: normalizeAdminProfile(data.admin),
    };
  },

  me: async (): Promise<AdminProfile> => {
    const { data } = await api.get<AdminProfile>('/auth/admin/me');
    return normalizeAdminProfile(data);
  },
};

export const adminApi = {
  getDashboard: async (): Promise<AdminDashboard> => {
    const { data } = await api.get<AdminDashboard>('/admin/dashboard');
    return normalizeAdminDashboard(data);
  },
};

export default api;
