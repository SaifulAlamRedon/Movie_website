import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, moviesApi, usersApi } from '../services/api';
import type {
  AdminDashboard,
  Movie,
  MovieQuery,
  PaginatedResponse,
  PublicProfile,
  User,
  UserQuery,
} from '../types';

export function useMovies(query: MovieQuery) {
  const [data, setData] = useState<PaginatedResponse<Movie> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await moviesApi.getAll(query);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load titles');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query)]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useMovie(id: string | undefined) {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setMovie(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    moviesApi
      .getById(id)
      .then(setMovie)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load title'))
      .finally(() => setLoading(false));
  }, [id]);

  return { movie, loading, error };
}

export function useTrending(limit = 10) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    moviesApi
      .getTrending(limit)
      .then(setMovies)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load trending titles'))
      .finally(() => setLoading(false));
  }, [limit]);

  return { movies, loading, error };
}

export function useFeatured(limit = 8) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    moviesApi
      .getFeatured(limit)
      .then(setMovies)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load featured titles'))
      .finally(() => setLoading(false));
  }, [limit]);

  return { movies, loading, error };
}

export function useGenres() {
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    moviesApi.getGenres().then(setGenres).catch(() => {});
  }, []);

  return genres;
}

export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    moviesApi.getCategories().then(setCategories).catch(() => {});
  }, []);

  return categories;
}

export function useUsers(query: UserQuery) {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await usersApi.getAll(query);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query)]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function usePublicProfiles() {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);

    try {
      const result = await usersApi.getProfiles();
      setProfiles(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { profiles, loading, refetch: fetch };
}

export function useAdminDashboard(enabled = true) {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await adminApi.getDashboard();
      setDashboard(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { dashboard, loading, error, refetch: fetch };
}

export function useSearch(query: string, delay = 350) {
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const result = await moviesApi.search(query);
        setResults(result);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query, delay]);

  return { results, loading };
}
