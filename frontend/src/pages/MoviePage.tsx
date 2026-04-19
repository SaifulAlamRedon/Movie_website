import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  Clock,
  Download,
  Eye,
  Film,
  Globe,
  Play,
  Star,
  Tv,
  Users,
  X,
} from 'lucide-react';
import MovieCard from '../components/MovieCard/MovieCard';
import SkeletonCard from '../components/SkeletonCard/SkeletonCard';
import { useMovie, useMovies } from '../hooks/useMovies';
import { moviesApi } from '../services/api';
import styles from './MoviePage.module.css';

export default function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { movie, loading, error } = useMovie(id);
  const [posterError, setPosterError] = useState(false);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'play' | 'download' | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  const { data: related } = useMovies({
    genre: movie?.genre?.[0],
    limit: 8,
    sortBy: 'popularity',
    order: 'DESC',
  });

  const relatedMovies = useMemo(
    () => related?.data.filter((item) => item.id !== id).slice(0, 6) ?? [],
    [id, related?.data],
  );

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error || !movie) {
    return (
      <div className={styles.errorState}>
        <h2>Title not found</h2>
        <p>{error || 'This title is unavailable right now.'}</p>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const runtime = movie.runtimeMinutes
    ? `${Math.floor(movie.runtimeMinutes / 60)}h ${movie.runtimeMinutes % 60}m`
    : null;
  const posterFallback = `https://placehold.co/300x450/13131a/444?text=${encodeURIComponent(movie.title)}`;
  const backdropFallback = `https://placehold.co/1400x500/0a0a0f/222?text=${encodeURIComponent(movie.title)}`;
  const downloadEnabled = Boolean(movie.downloadUrl || movie.streamUrl);

  const showToast = (message: string, ok = true) => {
    setToast({ message, ok });
    window.setTimeout(() => setToast(null), 3000);
  };

  const handlePlay = async () => {
    try {
      setBusyAction('play');
      const response = await moviesApi.trackView(movie.id);
      const streamUrl = response.streamUrl || movie.streamUrl;

      if (!streamUrl) {
        throw new Error('Streaming is not enabled for this title yet.');
      }

      setPlayerUrl(streamUrl);
      showToast(`Now playing ${movie.title}`);
    } catch (playError) {
      showToast(playError instanceof Error ? playError.message : 'Could not start playback', false);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownload = async () => {
    try {
      setBusyAction('download');
      const response = await moviesApi.trackDownload(movie.id);
      triggerDownload(response.downloadUrl);
      showToast(`Download started for ${movie.title}`);
    } catch (downloadError) {
      showToast(downloadError instanceof Error ? downloadError.message : 'Could not start download', false);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <main className={styles.page}>
      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.message}
        </div>
      )}

      <div className={styles.backdrop}>
        <img
          src={movie.backdropUrl || backdropFallback}
          alt=""
          className={styles.backdropImg}
          onError={(event) => {
            (event.target as HTMLImageElement).src = backdropFallback;
          }}
        />
        <div className={styles.backdropOverlay} />
      </div>

      <div className={`container ${styles.content}`}>
        <Link to="/browse" className={styles.backLink}>
          <ChevronLeft size={18} />
          Back to Browse
        </Link>

        <section className={styles.hero}>
          <div className={styles.posterColumn}>
            <img
              src={posterError ? posterFallback : movie.posterUrl || posterFallback}
              alt={movie.title}
              className={styles.poster}
              onError={() => setPosterError(true)}
            />
          </div>

          <div className={styles.details}>
            <div className={styles.badges}>
              <span className={styles.typeBadge}>
                {movie.contentType === 'tv' ? <Tv size={14} /> : <Film size={14} />}
                {movie.contentType === 'tv' ? 'TV Show' : 'Movie'}
              </span>
              {movie.category && <span className={styles.infoBadge}>{movie.category}</span>}
              {movie.isTrending && <span className={styles.infoBadge}>Trending</span>}
              {movie.isFeatured && <span className={styles.infoBadge}>Featured</span>}
            </div>

            <h1 className={styles.title}>{movie.title}</h1>

            <div className={styles.metaRow}>
              <span className={styles.ratingBadge}>
                <Star size={14} fill="var(--gold)" color="var(--gold)" />
                {Number(movie.rating || 0).toFixed(1)}
              </span>
              <span className={styles.metaItem}>
                <Eye size={14} />
                {compactCount(movie.viewCount)} views
              </span>
              <span className={styles.metaItem}>
                <Download size={14} />
                {compactCount(movie.downloadCount)} downloads
              </span>
              {year && (
                <span className={styles.metaItem}>
                  <Calendar size={14} />
                  {year}
                </span>
              )}
              {runtime && (
                <span className={styles.metaItem}>
                  <Clock size={14} />
                  {runtime}
                </span>
              )}
              {movie.language && (
                <span className={styles.metaItem}>
                  <Globe size={14} />
                  {movie.language.toUpperCase()}
                </span>
              )}
            </div>

            {movie.description && (
              <p className={styles.description}>{movie.description}</p>
            )}

            <div className={styles.ctaRow}>
              <button className={styles.playBtn} onClick={() => void handlePlay()} disabled={busyAction === 'play' || !movie.streamUrl}>
                <Play size={18} />
                {busyAction === 'play' ? 'Starting...' : 'Watch Now'}
              </button>

              <button className={styles.downloadBtn} onClick={() => void handleDownload()} disabled={busyAction === 'download' || !downloadEnabled}>
                <Download size={18} />
                {busyAction === 'download' ? 'Preparing...' : 'Download'}
              </button>
            </div>

            {!movie.streamUrl && (
              <div className={styles.notice}>
                <AlertCircle size={16} />
                Streaming is not enabled for this title yet. Add a stream file or stream URL from the admin panel.
              </div>
            )}

            {playerUrl && (
              <div className={styles.playerCard}>
                <div className={styles.playerHeader}>
                  <div>
                    <span className={styles.playerEyebrow}>Now Streaming</span>
                    <h3 className={styles.playerTitle}>{movie.title}</h3>
                  </div>
                  <button className={styles.playerCloseBtn} onClick={() => setPlayerUrl(null)}>
                    <X size={16} />
                    Close
                  </button>
                </div>
                <video
                  className={styles.player}
                  controls
                  autoPlay
                  poster={movie.backdropUrl || movie.posterUrl || backdropFallback}
                >
                  <source src={playerUrl} type="video/mp4" />
                  Your browser does not support inline playback for this source.
                </video>
              </div>
            )}

            <div className={styles.infoGrid}>
              {movie.director && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Director</span>
                  <span className={styles.infoValue}>{movie.director}</span>
                </div>
              )}
              {movie.releaseDate && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Release Date</span>
                  <span className={styles.infoValue}>
                    {new Date(movie.releaseDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {movie.category && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Category</span>
                  <span className={styles.infoValue}>{movie.category}</span>
                </div>
              )}
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Popularity</span>
                <span className={styles.infoValue}>{compactCount(movie.voteCount)} votes</span>
              </div>
            </div>

            {movie.genre.length > 0 && (
              <div className={styles.tagBlock}>
                <h3 className={styles.tagTitle}>Genres</h3>
                <div className={styles.tagList}>
                  {movie.genre.map((genre) => (
                    <Link key={genre} to={`/browse?genre=${encodeURIComponent(genre)}`} className={styles.tag}>
                      {genre}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {movie.cast.length > 0 && (
              <div className={styles.tagBlock}>
                <h3 className={styles.tagTitle}>Cast</h3>
                <div className={styles.tagList}>
                  {movie.cast.map((actor) => (
                    <span key={actor} className={styles.tag}>{actor}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {relatedMovies.length > 0 && (
          <section className={styles.relatedSection}>
            <div className="section-header">
              <div className="section-accent" />
              <h2 className="section-title">More Like This</h2>
            </div>
            <div className="scroll-row">
              {relatedMovies.map((relatedMovie) => (
                <MovieCard key={relatedMovie.id} movie={relatedMovie} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function DetailSkeleton() {
  return (
    <div className={`container ${styles.skeletonPage}`}>
      <div className={styles.hero}>
        <div className={styles.posterColumn}>
          <div className="skeleton" style={{ aspectRatio: '2 / 3', borderRadius: 20 }} />
        </div>
        <div className={styles.skeletonColumn}>
          <div className="skeleton" style={{ height: 16, width: '28%', borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 64, width: '72%', borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 18, width: '62%', borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 120, width: '100%', borderRadius: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <SkeletonCard count={4} />
          </div>
        </div>
      </div>
    </div>
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
