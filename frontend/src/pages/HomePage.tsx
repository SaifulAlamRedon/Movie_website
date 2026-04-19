import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import HeroBanner from '../components/HeroBanner/HeroBanner';
import MovieCard from '../components/MovieCard/MovieCard';
import SkeletonCard from '../components/SkeletonCard/SkeletonCard';
import { useFeatured, useTrending, useMovies } from '../hooks/useMovies';
import styles from './HomePage.module.css';

/**
 * HomePage
 * Sections: Hero banner → Trending → Latest → Top Rated
 * Each row is a horizontally scrollable strip of MovieCards.
 */
export default function HomePage() {
  const { movies: featured, loading: featuredLoading } = useFeatured();
  const { movies: trending, loading: trendingLoading } = useTrending(12);
  const { data: latest, loading: latestLoading } = useMovies({ sortBy: 'releaseDate', order: 'DESC', limit: 12 });
  const { data: topRated, loading: topLoading } = useMovies({ sortBy: 'rating', order: 'DESC', limit: 12 });

  return (
    <main>
      {/* ── Hero ── */}
      {featuredLoading ? (
        <div className={styles.heroSkeleton} />
      ) : (
        <HeroBanner movies={featured} />
      )}

      <div className="container" style={{ paddingTop: 48, paddingBottom: 64 }}>

        {/* ── Trending ── */}
        <Section title="🔥 Trending Now" href="/browse?trending=true" loading={trendingLoading}>
          {trendingLoading
            ? <SkeletonCard count={6} />
            : trending.map((m) => <MovieCard key={m.id} movie={m} />)
          }
        </Section>

        {/* ── Latest ── */}
        <Section title="New Releases" href="/browse?sortBy=releaseDate" loading={latestLoading}>
          {latestLoading
            ? <SkeletonCard count={6} />
            : latest?.data.map((m) => <MovieCard key={m.id} movie={m} />)
          }
        </Section>

        {/* ── Top Rated ── */}
        <Section title="Top Rated" href="/browse?sortBy=rating" loading={topLoading}>
          {topLoading
            ? <SkeletonCard count={6} />
            : topRated?.data.map((m) => <MovieCard key={m.id} movie={m} />)
          }
        </Section>

      </div>
    </main>
  );
}

/* ── Reusable row section ─────────────────────────────────────── */
function Section({
  title, href, loading, children,
}: {
  title: string; href: string; loading: boolean; children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className="section-header">
        <div className="section-accent" />
        <h2 className="section-title">{title}</h2>
        {!loading && (
          <Link to={href} className={styles.seeAll}>
            See all <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="scroll-row">{children}</div>
    </section>
  );
}
