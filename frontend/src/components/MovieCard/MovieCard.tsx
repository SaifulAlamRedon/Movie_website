import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Play } from 'lucide-react';
import type { Movie } from '../../types';
import styles from './MovieCard.module.css';

interface Props {
  movie: Movie;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * MovieCard
 * Displays a movie poster with hover overlay showing title, rating, and genres.
 * Links to the detail page. Supports three sizes for different layout contexts.
 */
export default function MovieCard({ movie, size = 'md' }: Props) {
  const [imgError, setImgError] = useState(false);
  const fallback = `https://placehold.co/300x450/13131a/555?text=${encodeURIComponent(movie.title)}`;

  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const runtime = movie.runtimeMinutes
    ? `${Math.floor(movie.runtimeMinutes / 60)}h ${movie.runtimeMinutes % 60}m`
    : null;

  return (
    <Link to={`/movie/${movie.id}`} className={`${styles.card} ${styles[size]}`}>
      {/* Poster */}
      <div className={styles.posterWrap}>
        <img
          src={imgError ? fallback : (movie.posterUrl || fallback)}
          alt={movie.title}
          className={styles.poster}
          loading="lazy"
          onError={() => setImgError(true)}
        />

        {/* Hover overlay */}
        <div className={styles.overlay}>
          <button className={styles.playBtn} aria-label="View details">
            <Play size={20} fill="white" />
          </button>
          <div className={styles.overlayInfo}>
            <div className={styles.rating}>
              <Star size={13} fill="var(--gold)" color="var(--gold)" />
              <span>{Number(movie.rating).toFixed(1)}</span>
            </div>
            {runtime && (
              <div className={styles.runtime}>
                <Clock size={12} />
                <span>{runtime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Trending badge */}
        {movie.isTrending && (
          <div className={styles.badge}>🔥 Trending</div>
        )}
      </div>

      {/* Card footer */}
      <div className={styles.info}>
        <p className={styles.title}>{movie.title}</p>
        <p className={styles.meta}>
          {year && <span>{year}</span>}
          {movie.genre?.[0] && <span className={styles.genre}>{movie.genre[0]}</span>}
        </p>
      </div>
    </Link>
  );
}
