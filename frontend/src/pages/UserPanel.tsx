import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Download,
  Film,
  Play,
  Search,
  Sparkles,
  Star,
  Tv,
  UserCircle2,
  X,
} from 'lucide-react';
import { useCategories, useGenres, useMovies, usePublicProfiles } from '../hooks/useMovies';
import { moviesApi } from '../services/api';
import type { Movie } from '../types';
import styles from './UserPanel.module.css';

type SortMode = 'popularity' | 'latest' | 'rating' | 'downloads';
type ContentFilter = 'all' | 'movie' | 'tv';

const toastDurationMs = 3200;

export default function UserPanel() {
  const { data: movieData, loading: moviesLoading, error: moviesError } = useMovies({
    limit: 60,
    sortBy: 'popularity',
    order: 'DESC',
  });
  const { profiles, loading: profilesLoading } = usePublicProfiles();
  const genres = useGenres();
  const categories = useCategories();

  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState<ContentFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('popularity');
  const [activeProfileId, setActiveProfileId] = useState('');
  const [spotlightId, setSpotlightId] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<{ movie: Movie; streamUrl: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const allMovies = movieData?.data ?? [];

  useEffect(() => {
    if (!activeProfileId && profiles.length > 0) {
      setActiveProfileId(profiles[0].id);
    }
  }, [activeProfileId, profiles]);

  useEffect(() => () => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
  }, []);

  const filteredMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = allMovies.filter((movie) => {
      const matchesQuery =
        !normalizedQuery ||
        movie.title.toLowerCase().includes(normalizedQuery) ||
        movie.description?.toLowerCase().includes(normalizedQuery) ||
        movie.category?.toLowerCase().includes(normalizedQuery) ||
        movie.genre.some((genre) => genre.toLowerCase().includes(normalizedQuery));

      const matchesGenre = selectedGenre === 'all' || movie.genre.includes(selectedGenre);
      const matchesCategory = selectedCategory === 'all' || movie.category === selectedCategory;
      const matchesType = selectedType === 'all' || movie.contentType === selectedType;

      return matchesQuery && matchesGenre && matchesCategory && matchesType;
    });

    return filtered.sort((first, second) => {
      if (sortMode === 'latest') {
        return new Date(second.releaseDate || 0).getTime() - new Date(first.releaseDate || 0).getTime();
      }

      if (sortMode === 'rating') {
        return Number(second.rating || 0) - Number(first.rating || 0);
      }

      if (sortMode === 'downloads') {
        return Number(second.downloadCount || 0) - Number(first.downloadCount || 0);
      }

      const popularitySecond = Number(second.viewCount || 0) + Number(second.voteCount || 0) * 0.01;
      const popularityFirst = Number(first.viewCount || 0) + Number(first.voteCount || 0) * 0.01;
      return popularitySecond - popularityFirst;
    });
  }, [allMovies, query, selectedGenre, selectedCategory, selectedType, sortMode]);

  useEffect(() => {
    const hasSpotlight = filteredMovies.some((movie) => movie.id === spotlightId);

    if (!hasSpotlight) {
      const nextSpotlight = filteredMovies.find((movie) => movie.isFeatured) ?? filteredMovies[0] ?? null;
      setSpotlightId(nextSpotlight?.id ?? '');
    }
  }, [filteredMovies, spotlightId]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [activeProfileId, profiles],
  );

  const spotlightMovie = useMemo(
    () => filteredMovies.find((movie) => movie.id === spotlightId) ?? filteredMovies[0] ?? null,
    [filteredMovies, spotlightId],
  );

  const featuredRail = useMemo(() => {
    const featured = filteredMovies.filter((movie) => movie.isFeatured);
    return (featured.length > 0 ? featured : filteredMovies).slice(0, 5);
  }, [filteredMovies]);

  const contentRows = useMemo(() => {
    const rows: Array<{ key: string; title: string; items: Movie[] }> = [];
    const moviesOnly = filteredMovies.filter((movie) => movie.contentType === 'movie');
    const showsOnly = filteredMovies.filter((movie) => movie.contentType === 'tv');

    if (filteredMovies.length > 0) {
      rows.push({ key: 'popular', title: 'Popular Now', items: filteredMovies.slice(0, 12) });
    }

    if (moviesOnly.length > 0) {
      rows.push({ key: 'movies', title: 'Movies', items: moviesOnly.slice(0, 12) });
    }

    if (showsOnly.length > 0) {
      rows.push({ key: 'shows', title: 'TV Shows', items: showsOnly.slice(0, 12) });
    }

    const groupedByCategory = new Map<string, Movie[]>();

    filteredMovies.forEach((movie) => {
      const category = movie.category || 'General';
      const current = groupedByCategory.get(category) ?? [];
      current.push(movie);
      groupedByCategory.set(category, current);
    });

    Array.from(groupedByCategory.entries())
      .sort(([, first], [, second]) => second.length - first.length)
      .slice(0, 4)
      .forEach(([category, items]) => {
        rows.push({ key: `category-${category}`, title: category, items: items.slice(0, 12) });
      });

    return rows;
  }, [filteredMovies]);

  const summary = useMemo(() => ({
    total: filteredMovies.length,
    streamReady: filteredMovies.filter((movie) => Boolean(movie.streamUrl)).length,
    downloadsEnabled: filteredMovies.filter((movie) => Boolean(movie.downloadUrl || movie.streamUrl)).length,
  }), [filteredMovies]);

  const showToast = (message: string, ok = true) => {
    setToast({ message, ok });

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, toastDurationMs);
  };

  const handlePlay = async (movie: Movie) => {
    try {
      setBusyAction(`play-${movie.id}`);
      setSpotlightId(movie.id);
      const response = await moviesApi.trackView(movie.id, activeProfileId || undefined);
      const streamUrl = response.streamUrl || movie.streamUrl;

      if (!streamUrl) {
        throw new Error('Streaming is not enabled for this title yet.');
      }

      setPlayerState({ movie, streamUrl });
      showToast(`Now playing ${movie.title}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not start playback', false);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownload = async (movie: Movie) => {
    try {
      setBusyAction(`download-${movie.id}`);
      const response = await moviesApi.trackDownload(movie.id, activeProfileId || undefined);
      triggerDownload(response.downloadUrl);
      showToast(`Download started for ${movie.title}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not start download', false);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <main className={styles.page}>
      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.ok ? <Check size={16} /> : <X size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className={`container ${styles.layout}`}>
        <section className={styles.profileRail}>
          <div>
            <span className={styles.eyebrow}>
              <Sparkles size={14} />
              Viewer Profiles
            </span>
            <h1 className={styles.pageTitle}>Browse, stream, and download the CinemaFlow catalog like a home screen.</h1>
          </div>

          <div className={styles.profileList}>
            {profilesLoading && Array.from({ length: 3 }).map((_, index) => (
              <div key={`profile-skeleton-${index}`} className="skeleton" style={{ width: 132, height: 72, borderRadius: 18 }} />
            ))}

            {!profilesLoading && profiles.length === 0 && (
              <button type="button" className={`${styles.profileChip} ${styles.profileChipActive}`}>
                <UserCircle2 size={26} />
                <span>
                  <strong>Guest Mode</strong>
                  <small>Streaming still works</small>
                </span>
              </button>
            )}

            {!profilesLoading && profiles.map((profile) => (
              <button
                key={profile.id}
                className={`${styles.profileChip} ${activeProfileId === profile.id ? styles.profileChipActive : ''}`}
                onClick={() => setActiveProfileId(profile.id)}
                type="button"
              >
                <img
                  src={profile.avatarUrl || `https://placehold.co/48x48/1c1c28/f0f0f5?text=${encodeURIComponent(profile.name.charAt(0).toUpperCase())}`}
                  alt={profile.name}
                  className={styles.profileAvatar}
                  onError={(event) => {
                    (event.target as HTMLImageElement).src = `https://placehold.co/48x48/1c1c28/f0f0f5?text=${encodeURIComponent(profile.name.charAt(0).toUpperCase())}`;
                  }}
                />
                <span>
                  <strong>{profile.name}</strong>
                  <small>{profile.subscriptionPlan}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section
          className={styles.hero}
          style={{
            backgroundImage: spotlightMovie
              ? `linear-gradient(90deg, rgba(5,6,10,0.92) 0%, rgba(5,6,10,0.65) 45%, rgba(5,6,10,0.3) 100%), url(${spotlightMovie.backdropUrl || spotlightMovie.posterUrl})`
              : undefined,
          }}
        >
          <div className={styles.heroCopy}>
            <span className={styles.heroMeta}>
              {spotlightMovie?.contentType === 'tv' ? <Tv size={14} /> : <Film size={14} />}
              {spotlightMovie?.contentType === 'tv' ? 'Series Spotlight' : 'Movie Spotlight'}
            </span>

            {spotlightMovie ? (
              <>
                <h2 className={styles.heroTitle}>{spotlightMovie.title}</h2>
                <p className={styles.heroDescription}>
                  {spotlightMovie.description || 'No synopsis yet. Add one from the hidden admin panel to enrich the catalog.'}
                </p>

                <div className={styles.heroChips}>
                  <span className={styles.infoChip}><Star size={13} /> {Number(spotlightMovie.rating || 0).toFixed(1)}</span>
                  <span className={styles.infoChip}>{spotlightMovie.category || 'General'}</span>
                  <span className={styles.infoChip}>{spotlightMovie.releaseDate ? spotlightMovie.releaseDate.slice(0, 4) : 'TBA'}</span>
                  {spotlightMovie.genre.slice(0, 2).map((genre) => (
                    <span key={genre} className={styles.infoChip}>{genre}</span>
                  ))}
                </div>

                <div className={styles.heroActions}>
                  <button
                    className={styles.playBtn}
                    onClick={() => void handlePlay(spotlightMovie)}
                    disabled={busyAction === `play-${spotlightMovie.id}` || !spotlightMovie.streamUrl}
                  >
                    <Play size={18} />
                    {busyAction === `play-${spotlightMovie.id}` ? 'Starting...' : 'Play Now'}
                  </button>
                  <button
                    className={styles.downloadBtn}
                    onClick={() => void handleDownload(spotlightMovie)}
                    disabled={busyAction === `download-${spotlightMovie.id}` || !(spotlightMovie.downloadUrl || spotlightMovie.streamUrl)}
                  >
                    <Download size={18} />
                    {busyAction === `download-${spotlightMovie.id}` ? 'Preparing...' : 'Download'}
                  </button>
                  <Link className={styles.detailBtn} to={`/movie/${spotlightMovie.id}`}>
                    View Details
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className={styles.heroTitle}>No titles match the current filters.</h2>
                <p className={styles.heroDescription}>Try clearing a filter or searching for a broader genre to bring the rows back.</p>
              </>
            )}
          </div>

          <div className={styles.heroQueue}>
            <div className={styles.queueHeader}>
              <span className={styles.eyebrow}>Featured Picks</span>
              <span className={styles.queueProfile}>{activeProfile?.name || 'Guest Mode'} is browsing</span>
            </div>

            <div className={styles.queueList}>
              {featuredRail.map((movie) => (
                <button
                  key={movie.id}
                  type="button"
                  className={`${styles.queueItem} ${movie.id === spotlightMovie?.id ? styles.queueItemActive : ''}`}
                  onClick={() => setSpotlightId(movie.id)}
                >
                  <img
                    src={movie.posterUrl || 'https://placehold.co/56x84/13131a/444?text=Title'}
                    alt={movie.title}
                    className={styles.queuePoster}
                    onError={(event) => {
                      (event.target as HTMLImageElement).src = 'https://placehold.co/56x84/13131a/444?text=Title';
                    }}
                  />
                  <span>
                    <strong>{movie.title}</strong>
                    <small>{movie.category || 'General'}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.filters}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search movies, shows, genres, or categories"
            />
          </div>

          <select className={styles.select} value={selectedType} onChange={(event) => setSelectedType(event.target.value as ContentFilter)}>
            <option value="all">All formats</option>
            <option value="movie">Movies</option>
            <option value="tv">TV shows</option>
          </select>

          <select className={styles.select} value={selectedGenre} onChange={(event) => setSelectedGenre(event.target.value)}>
            <option value="all">All genres</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>

          <select className={styles.select} value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select className={styles.select} value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="popularity">Sort: popularity</option>
            <option value="latest">Sort: latest</option>
            <option value="rating">Sort: rating</option>
            <option value="downloads">Sort: downloads</option>
          </select>
        </section>

        <section className={styles.summaryBar}>
          <span className={styles.summaryPill}>{summary.total} titles match</span>
          <span className={styles.summaryPill}>{summary.streamReady} ready to stream</span>
          <span className={styles.summaryPill}>{summary.downloadsEnabled} ready to download</span>
          <span className={styles.summaryPillAlt}>{activeProfile?.name || 'Guest Mode'} is active</span>
        </section>

        {moviesError && (
          <div className={styles.errorBox}>{moviesError}</div>
        )}

        {moviesLoading && (
          <section className={styles.loadingGrid}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={`loading-card-${index}`} className="skeleton" style={{ height: 260, borderRadius: 20 }} />
            ))}
          </section>
        )}

        {!moviesLoading && filteredMovies.length === 0 && (
          <section className={styles.emptyState}>
            No titles match this search and filter combination yet.
          </section>
        )}

        {!moviesLoading && contentRows.map((row) => (
          <section key={row.key} className={styles.rowSection}>
            <div className={styles.rowHeader}>
              <h3 className={styles.rowTitle}>{row.title}</h3>
              <span className={styles.rowMeta}>{row.items.length} titles</span>
            </div>

            <div className={styles.carousel}>
              {row.items.map((movie) => (
                <article key={movie.id} className={styles.card}>
                  <button type="button" className={styles.cardImageButton} onClick={() => setSpotlightId(movie.id)}>
                    <img
                      src={movie.backdropUrl || movie.posterUrl || 'https://placehold.co/480x270/13131a/444?text=Title'}
                      alt={movie.title}
                      className={styles.cardImage}
                      onError={(event) => {
                        (event.target as HTMLImageElement).src = 'https://placehold.co/480x270/13131a/444?text=Title';
                      }}
                    />
                  </button>

                  <div className={styles.cardBody}>
                    <div>
                      <p className={styles.cardMeta}>
                        {movie.contentType === 'tv' ? 'TV Show' : 'Movie'} · {movie.category || 'General'}
                      </p>
                      <h4 className={styles.cardTitle}>{movie.title}</h4>
                      <p className={styles.cardDescription}>
                        {movie.description || 'No description available for this title yet.'}
                      </p>
                    </div>

                    <div className={styles.cardFooter}>
                      <div className={styles.cardStats}>
                        <span><Star size={12} /> {Number(movie.rating || 0).toFixed(1)}</span>
                        <span><Play size={12} /> {compactCount(movie.viewCount)}</span>
                        <span><Download size={12} /> {compactCount(movie.downloadCount)}</span>
                      </div>

                      <div className={styles.cardActions}>
                        <button
                          className={styles.cardPlayBtn}
                          onClick={() => void handlePlay(movie)}
                          disabled={busyAction === `play-${movie.id}` || !movie.streamUrl}
                        >
                          <Play size={15} />
                          Play
                        </button>
                        <button
                          className={styles.cardDownloadBtn}
                          onClick={() => void handleDownload(movie)}
                          disabled={busyAction === `download-${movie.id}` || !(movie.downloadUrl || movie.streamUrl)}
                        >
                          <Download size={15} />
                          Download
                        </button>
                        <Link className={styles.cardDetailLink} to={`/movie/${movie.id}`}>
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {playerState && (
        <div className={styles.playerOverlay} onClick={() => setPlayerState(null)}>
          <div className={styles.playerModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.playerHeader}>
              <div>
                <span className={styles.eyebrow}>Now Streaming</span>
                <h3 className={styles.playerTitle}>{playerState.movie.title}</h3>
                <p className={styles.playerSubtitle}>
                  Playing for {activeProfile?.name || 'Guest Mode'} · {playerState.movie.category || 'General'}
                </p>
              </div>
              <button type="button" className={styles.playerCloseBtn} onClick={() => setPlayerState(null)}>
                <X size={18} />
              </button>
            </div>

            <video
              className={styles.player}
              controls
              autoPlay
              poster={playerState.movie.backdropUrl || playerState.movie.posterUrl}
            >
              <source src={playerState.streamUrl} type="video/mp4" />
              Your browser could not play this video source.
            </video>
          </div>
        </div>
      )}
    </main>
  );
}

function triggerDownload(url: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noreferrer';
  anchor.download = '';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function compactCount(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}
