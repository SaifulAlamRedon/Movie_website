import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import MovieCard from '../components/MovieCard/MovieCard';
import SkeletonCard from '../components/SkeletonCard/SkeletonCard';
import GenreFilter from '../components/GenreFilter/GenreFilter';
import Pagination from '../components/Pagination';
import { useMovies, useGenres } from '../hooks/useMovies';
import { useAppContext } from '../context/AppContext';
import styles from './BrowsePage.module.css';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest Added' },
  { value: 'releaseDate', label: 'Release Date' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'title', label: 'A–Z' },
  { value: 'voteCount', label: 'Most Popular' },
];

/**
 * BrowsePage
 * Full movie grid with:
 * - Genre filter bar
 * - Sort dropdown
 * - Paginated results
 * - URL-synced query params (so the URL is shareable)
 */
export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const genres = useGenres();

  const {
    searchQuery, selectedGenre, sortBy, order, currentPage,
    setSearchQuery, setSelectedGenre, setSortBy, setOrder, setCurrentPage, resetFilters,
  } = useAppContext();

  // Sync URL params → context on mount
  useEffect(() => {
    const q  = searchParams.get('q')       || '';
    const g  = searchParams.get('genre')   || '';
    const sb = searchParams.get('sortBy')  || 'createdAt';
    const p  = Number(searchParams.get('page')) || 1;
    if (q)  setSearchQuery(q);
    if (g)  setSelectedGenre(g);
    if (sb) setSortBy(sb);
    if (p)  setCurrentPage(p);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync context → URL whenever filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchQuery)   params.q      = searchQuery;
    if (selectedGenre) params.genre  = selectedGenre;
    if (sortBy !== 'createdAt') params.sortBy = sortBy;
    if (currentPage > 1) params.page = String(currentPage);
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedGenre, sortBy, currentPage, setSearchParams]);

  const { data, loading, error } = useMovies({
    q: searchQuery || undefined,
    genre: selectedGenre || undefined,
    sortBy,
    order,
    page: currentPage,
    limit: 20,
  });

  const handleGenre = (g: string) => { setSelectedGenre(g); setCurrentPage(1); };
  const handleSort  = (e: React.ChangeEvent<HTMLSelectElement>) => { setSortBy(e.target.value); setCurrentPage(1); };
  const handleOrder = () => { setOrder(order === 'DESC' ? 'ASC' : 'DESC'); };

  const hasFilters = !!(searchQuery || selectedGenre || sortBy !== 'createdAt');

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>

      {/* ── Page header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>
            {searchQuery ? `Results for "${searchQuery}"` : 'Browse Movies'}
          </h1>
          {data && (
            <p className={styles.count}>
              {data.meta.total} movie{data.meta.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {hasFilters && (
          <button className={styles.resetBtn} onClick={resetFilters}>
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      {/* ── Genre filter bar ── */}
      <div className={styles.filterBar}>
        <GenreFilter
          genres={genres}
          selected={selectedGenre}
          onChange={handleGenre}
        />

        {/* Sort controls */}
        <div className={styles.sortControls}>
          <SlidersHorizontal size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <select className={styles.sortSelect} value={sortBy} onChange={handleSort}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            className={styles.orderBtn}
            onClick={handleOrder}
            title={order === 'DESC' ? 'Descending' : 'Ascending'}
          >
            {order === 'DESC' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className={styles.errorBox}>
          <p>⚠️ {error}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6 }}>
            Make sure the backend is running on port 3001 and the database is seeded.
          </p>
        </div>
      )}

      {/* ── Movie grid ── */}
      <div className={styles.grid}>
        {loading
          ? Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{ width: '100%' }}>
                <SkeletonCard count={1} />
              </div>
            ))
          : data?.data.map((movie) => (
              <MovieCard key={movie.id} movie={movie} size="lg" />
            ))
        }
      </div>

      {/* ── Empty state ── */}
      {!loading && !error && data?.data.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyIcon}>🎬</p>
          <p className={styles.emptyTitle}>No movies found</p>
          <p className={styles.emptyDesc}>
            Try a different search term or genre filter.
          </p>
          <button className={styles.resetBtn} onClick={resetFilters}>
            Reset filters
          </button>
        </div>
      )}

      {/* ── Pagination ── */}
      {data && data.meta.totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={data.meta.totalPages}
          onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        />
      )}
    </main>
  );
}
