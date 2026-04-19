import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Film, Menu, X, Shield, LogOut } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useSearch } from '../../hooks/useMovies';
import styles from './Navbar.module.css';

/**
 * Navbar
 * - Sticky top nav with blur backdrop
 * - Inline search with debounced autocomplete dropdown
 * - Active link detection via useLocation
 */
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, logout } = useAdminAuth();

  const { results, loading: searchLoading } = useSearch(searchValue);

  // Add shadow when scrolled
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Focus input when search bar opens
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchValue('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectResult = (id: string) => {
    navigate(`/movie/${id}`);
    setSearchOpen(false);
    setSearchValue('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchValue.trim())}`);
      setSearchOpen(false);
      setSearchValue('');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <Film size={22} color="var(--accent)" />
          <span>CINEMA<span className={styles.logoAccent}>FLOW</span></span>
        </Link>

        {/* Desktop nav links */}
        <ul className={styles.links}>
          <li><Link to="/"       className={isActive('/')       ? styles.activeLink : styles.link}>Home</Link></li>
          <li><Link to="/browse" className={isActive('/browse') ? styles.activeLink : styles.link}>Browse</Link></li>
          {isAuthenticated && (
            <li><Link to="/admin"  className={isActive('/admin')  ? styles.activeLink : styles.link}><Shield size={14} style={{marginRight:4}}/>Admin</Link></li>
          )}
        </ul>

        {/* Right actions */}
        <div className={styles.actions}>
          {/* Search */}
          <div ref={dropdownRef} className={styles.searchWrap}>
            <button
              className={styles.iconBtn}
              onClick={() => setSearchOpen((o) => !o)}
              aria-label="Toggle search"
            >
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            {searchOpen && (
              <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
                <input
                  ref={inputRef}
                  className={styles.searchInput}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search titles..."
                  autoComplete="off"
                />
                {/* Autocomplete dropdown */}
                {searchValue && (
                  <div className={styles.dropdown}>
                    {searchLoading && (
                      <div className={styles.dropdownItem} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Searching...
                      </div>
                    )}
                    {!searchLoading && results.length === 0 && (
                      <div className={styles.dropdownItem} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No results for "{searchValue}"
                      </div>
                    )}
                    {results.map((movie) => (
                      <button
                        key={movie.id}
                        type="button"
                        className={styles.dropdownItem}
                        onClick={() => handleSelectResult(movie.id)}
                      >
                        <img
                          src={movie.posterUrl || 'https://placehold.co/32x48/13131a/444?text=?'}
                          alt={movie.title}
                          className={styles.dropdownPoster}
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/32x48/13131a/444?text=?'; }}
                        />
                        <div>
                          <div style={{ fontWeight: 500 }}>{movie.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {[movie.releaseDate?.slice(0, 4), `Rating ${movie.rating}`].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </button>
                    ))}
                    {results.length > 0 && (
                      <button
                        type="submit"
                        className={styles.dropdownSeeAll}
                      >
                        See all results for "{searchValue}"
                      </button>
                    )}
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className={`${styles.iconBtn} ${styles.hamburger}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          {isAuthenticated && (
            <button
              className={styles.logoutBtn}
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link to="/"       onClick={() => setMenuOpen(false)} className={styles.mobileLink}>Home</Link>
          <Link to="/browse" onClick={() => setMenuOpen(false)} className={styles.mobileLink}>Browse</Link>
          <Link to="/user-panel" onClick={() => setMenuOpen(false)} className={styles.mobileLink}>User Panel</Link>
          {isAuthenticated && (
            <>
              <Link to="/admin"  onClick={() => setMenuOpen(false)} className={styles.mobileLink}>Admin Panel</Link>
              <button
                className={styles.mobileLogout}
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                  navigate('/');
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
