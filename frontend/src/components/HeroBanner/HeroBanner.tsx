import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, Star } from 'lucide-react';
import type { Movie } from '../../types';
import styles from './HeroBanner.module.css';

interface Props { movies: Movie[]; }

/**
 * HeroBanner
 * Full-width cinematic banner cycling through featured movies every 6 seconds.
 * Shows backdrop, title, description, rating, and genre tags.
 */
export default function HeroBanner({ movies }: Props) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  // Auto-rotate every 6s
  useEffect(() => {
    if (movies.length <= 1) return;
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % movies.length);
        setFading(false);
      }, 400);
    }, 6000);
    return () => clearInterval(id);
  }, [movies.length]);

  if (!movies.length) return null;

  const movie = movies[current];
  const fallbackBg = `https://placehold.co/1400x600/0a0a0f/222?text=${encodeURIComponent(movie.title)}`;

  return (
    <div className={styles.hero}>
      {/* Background image */}
      <div
        className={`${styles.bg} ${fading ? styles.fading : ''}`}
        style={{ backgroundImage: `url(${movie.backdropUrl || fallbackBg})` }}
      />
      {/* Gradient overlays */}
      <div className={styles.gradientBottom} />
      <div className={styles.gradientLeft} />

      {/* Content */}
      <div className={`${styles.content} ${fading ? styles.fading : ''}`}>
        <div className={styles.genres}>
          {movie.genre?.slice(0, 3).map((g) => (
            <span key={g} className={styles.genreTag}>{g}</span>
          ))}
        </div>
        <h1 className={styles.title}>{movie.title}</h1>
        <div className={styles.meta}>
          <span className={styles.rating}>
            <Star size={14} fill="var(--gold)" color="var(--gold)" />
            {Number(movie.rating).toFixed(1)}
          </span>
          {movie.releaseDate && <span>{new Date(movie.releaseDate).getFullYear()}</span>}
          {movie.runtimeMinutes && (
            <span>{Math.floor(movie.runtimeMinutes / 60)}h {movie.runtimeMinutes % 60}m</span>
          )}
        </div>
        <p className={styles.desc}>{movie.description?.slice(0, 180)}{movie.description?.length > 180 ? '…' : ''}</p>

        <div className={styles.cta}>
          <Link to={`/movie/${movie.id}`} className={styles.btnPrimary}>
            <Play size={18} fill="white" />
            View Details
          </Link>
          <Link to={`/movie/${movie.id}`} className={styles.btnSecondary}>
            <Info size={18} />
            More Info
          </Link>
        </div>
      </div>

      {/* Slide indicators */}
      {movies.length > 1 && (
        <div className={styles.indicators}>
          {movies.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
              onClick={() => { setFading(true); setTimeout(() => { setCurrent(i); setFading(false); }, 300); }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
