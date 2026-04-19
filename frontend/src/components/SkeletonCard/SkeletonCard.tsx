import React from 'react';
import styles from './SkeletonCard.module.css';

interface Props { count?: number; }

/**
 * SkeletonCard
 * Renders shimmer placeholder cards while movie data is loading.
 * Matches the dimensions of MovieCard to prevent layout shift.
 */
export default function SkeletonCard({ count = 5 }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.card}>
          <div className={`${styles.poster} skeleton`} />
          <div className={styles.info}>
            <div className={`${styles.line} ${styles.title} skeleton`} />
            <div className={`${styles.line} ${styles.meta} skeleton`} />
          </div>
        </div>
      ))}
    </>
  );
}
