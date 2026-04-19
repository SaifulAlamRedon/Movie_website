import React from 'react';
import styles from './GenreFilter.module.css';

interface Props {
  genres: string[];
  selected: string;
  onChange: (genre: string) => void;
}

/**
 * GenreFilter
 * Horizontal pill buttons for genre filtering.
 * "All" is always the first option to reset the filter.
 */
export default function GenreFilter({ genres, selected, onChange }: Props) {
  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.pill} ${selected === '' ? styles.active : ''}`}
        onClick={() => onChange('')}
      >
        All
      </button>
      {genres.map((genre) => (
        <button
          key={genre}
          className={`${styles.pill} ${selected === genre ? styles.active : ''}`}
          onClick={() => onChange(genre)}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}
