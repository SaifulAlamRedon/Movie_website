import React, { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  Check,
  Clapperboard,
  Database,
  Download,
  Eye,
  Film,
  Lock,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UploadCloud,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminDashboard, useMovies, useUsers } from '../hooks/useMovies';
import { moviesApi, usersApi } from '../services/api';
import type { ActivityLog, Movie, MovieFormData, User, UserFormData } from '../types';
import styles from './AdminPage.module.css';

const EMPTY_MOVIE_FORM: MovieFormData = {
  title: '',
  description: '',
  posterUrl: '',
  backdropUrl: '',
  streamUrl: '',
  downloadUrl: '',
  contentType: 'movie',
  category: '',
  releaseDate: '',
  rating: 0,
  genre: [],
  director: '',
  cast: [],
  runtimeMinutes: 0,
  language: 'en',
  isTrending: false,
  isFeatured: false,
  voteCount: 0,
  viewCount: 0,
  downloadCount: 0,
};

const EMPTY_USER_FORM: UserFormData = {
  name: '',
  email: '',
  avatarUrl: '',
  role: 'viewer',
  subscriptionPlan: 'standard',
  isActive: true,
  isBlocked: false,
};

const EMPTY_UPLOAD_STATE = {
  posterUrl: false,
  backdropUrl: false,
  streamUrl: false,
  downloadUrl: false,
};

type UploadField = keyof typeof EMPTY_UPLOAD_STATE;
type ModalMode = 'movie-create' | 'movie-edit' | 'user-create' | 'user-edit' | null;

const uploadFieldMeta: Record<UploadField, { kind: string; accept: string; label: string }> = {
  posterUrl: { kind: 'poster', accept: 'image/*', label: 'Poster' },
  backdropUrl: { kind: 'backdrop', accept: 'image/*', label: 'Backdrop' },
  streamUrl: { kind: 'stream', accept: 'video/*,.mp4,.webm,.mkv', label: 'Stream File' },
  downloadUrl: { kind: 'download', accept: 'video/*,.mp4,.webm,.mkv,.zip', label: 'Download File' },
};

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export default function AdminPage() {
  const { admin } = useAdminAuth();
  const [moviePage, setMoviePage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [movieForm, setMovieForm] = useState<MovieFormData>(EMPTY_MOVIE_FORM);
  const [userForm, setUserForm] = useState<UserFormData>(EMPTY_USER_FORM);
  const [uploading, setUploading] = useState(EMPTY_UPLOAD_STATE);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const {
    data: movieData,
    loading: moviesLoading,
    error: moviesError,
    refetch: refetchMovies,
  } = useMovies({
    page: moviePage,
    limit: 8,
    sortBy: 'createdAt',
    order: 'DESC',
  });
  const {
    data: userData,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useUsers({
    page: userPage,
    limit: 8,
    sortBy: 'lastLoginAt',
    order: 'DESC',
  });
  const {
    dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useAdminDashboard(true);

  useEffect(() => () => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
  }, []);

  const movieStats = useMemo(() => {
    const pageData = movieData?.data ?? [];

    return {
      totalTitles: dashboard?.metrics.totalTitles ?? movieData?.meta.total ?? 0,
      totalMovies: dashboard?.metrics.totalMovies ?? pageData.filter((movie) => movie.contentType === 'movie').length,
      totalShows: dashboard?.metrics.totalShows ?? pageData.filter((movie) => movie.contentType === 'tv').length,
      totalViews: dashboard?.metrics.totalViews ?? pageData.reduce((sum, movie) => sum + Number(movie.viewCount ?? 0), 0),
      totalDownloads:
        dashboard?.metrics.totalDownloads ?? pageData.reduce((sum, movie) => sum + Number(movie.downloadCount ?? 0), 0),
    };
  }, [dashboard, movieData]);

  const userStats = useMemo(() => {
    const pageData = userData?.data ?? [];

    return {
      totalUsers: dashboard?.metrics.totalUsers ?? userData?.meta.total ?? 0,
      activeUsers:
        dashboard?.metrics.activeUsers ?? pageData.filter((user) => user.role === 'viewer' && user.isActive && !user.isBlocked).length,
      blockedUsers: dashboard?.metrics.blockedUsers ?? pageData.filter((user) => user.isBlocked).length,
      activeAdmins:
        dashboard?.metrics.activeAdmins ?? pageData.filter((user) => user.role === 'admin' && user.isActive && !user.isBlocked).length,
    };
  }, [dashboard, userData]);

  const showToast = (message: string, ok = true) => {
    setToast({ message, ok });

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3600);
  };

  const refreshAll = async () => {
    await Promise.all([refetchMovies(), refetchUsers(), refetchDashboard()]);
  };

  const resetMovieForm = () => {
    setMovieForm(EMPTY_MOVIE_FORM);
    setUploading(EMPTY_UPLOAD_STATE);
    setEditingMovie(null);
  };

  const resetUserForm = () => {
    setUserForm(EMPTY_USER_FORM);
    setEditingUser(null);
  };

  const closeModal = () => {
    setModalMode(null);
    resetMovieForm();
    resetUserForm();
  };

  const openMovieCreate = () => {
    resetMovieForm();
    setModalMode('movie-create');
  };

  const openMovieEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setUploading(EMPTY_UPLOAD_STATE);
    setMovieForm({
      title: movie.title,
      description: movie.description || '',
      posterUrl: movie.posterUrl || '',
      backdropUrl: movie.backdropUrl || '',
      streamUrl: movie.streamUrl || '',
      downloadUrl: movie.downloadUrl || '',
      contentType: movie.contentType || 'movie',
      category: movie.category || '',
      releaseDate: movie.releaseDate ? movie.releaseDate.slice(0, 10) : '',
      rating: Number(movie.rating) || 0,
      genre: movie.genre || [],
      director: movie.director || '',
      cast: movie.cast || [],
      runtimeMinutes: Number(movie.runtimeMinutes) || 0,
      language: movie.language || 'en',
      isTrending: Boolean(movie.isTrending),
      isFeatured: Boolean(movie.isFeatured),
      voteCount: Number(movie.voteCount) || 0,
      viewCount: Number(movie.viewCount) || 0,
      downloadCount: Number(movie.downloadCount) || 0,
    });
    setModalMode('movie-edit');
  };

  const openUserCreate = () => {
    resetUserForm();
    setModalMode('user-create');
  };

  const openUserEdit = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl || '',
      role: user.role || 'viewer',
      subscriptionPlan: user.subscriptionPlan || 'standard',
      isActive: Boolean(user.isActive),
      isBlocked: Boolean(user.isBlocked),
    });
    setModalMode('user-edit');
  };

  const handleMovieUpload = async (field: UploadField, file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      setUploading((current) => ({ ...current, [field]: true }));
      const response = await moviesApi.uploadFile(uploadFieldMeta[field].kind, file);
      setMovieForm((current) => ({ ...current, [field]: response.url }));
      showToast(`${uploadFieldMeta[field].label} uploaded`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Upload failed', false);
    } finally {
      setUploading((current) => ({ ...current, [field]: false }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (modalMode === 'movie-create' || modalMode === 'movie-edit') {
        const payload = buildMoviePayload(movieForm);

        if (!payload.title) {
          throw new Error('A title is required before saving.');
        }

        if (modalMode === 'movie-edit' && editingMovie) {
          await moviesApi.update(editingMovie.id, payload as Partial<MovieFormData>);
          showToast('Title updated successfully');
        } else {
          await moviesApi.create(payload as MovieFormData);
          showToast('Title created successfully');
        }

        closeModal();
        await refreshAll();
        return;
      }

      const payload = buildUserPayload(userForm);

      if (!payload.name || !payload.email) {
        throw new Error('Name and email are required before saving.');
      }

      if (modalMode === 'user-edit' && editingUser) {
        await usersApi.update(editingUser.id, payload as Partial<UserFormData>);
        showToast('User updated successfully');
      } else {
        await usersApi.create(payload as UserFormData);
        showToast('User created successfully');
      }

      closeModal();
      await refreshAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Save failed', false);
    } finally {
      setSaving(false);
    }
  };

  const handleMovieDelete = async (movie: Movie) => {
    if (!window.confirm(`Delete "${movie.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      setPendingAction(`movie-${movie.id}`);
      await moviesApi.remove(movie.id);
      showToast(`"${movie.title}" deleted`);
      await refreshAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Delete failed', false);
    } finally {
      setPendingAction(null);
    }
  };

  const handleUserDelete = async (user: User) => {
    if (admin?.id === user.id) {
      showToast('You cannot delete the admin account you are currently using.', false);
      return;
    }

    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      setPendingAction(`user-${user.id}`);
      await usersApi.remove(user.id);
      showToast(`"${user.name}" deleted`);
      await refreshAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Delete failed', false);
    } finally {
      setPendingAction(null);
    }
  };

  const handleUserBlockToggle = async (user: User) => {
    if (admin?.id === user.id) {
      showToast('To avoid locking you out, this admin account cannot be blocked from here.', false);
      return;
    }

    try {
      setPendingAction(`block-${user.id}`);
      await usersApi.setBlocked(user.id, !user.isBlocked);
      showToast(user.isBlocked ? `${user.name} unblocked` : `${user.name} blocked`);
      await refreshAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Block action failed', false);
    } finally {
      setPendingAction(null);
    }
  };

  const handleMovieSeed = async () => {
    try {
      setPendingAction('seed-movies');
      const response = await moviesApi.seed();
      showToast(response.message);
      await refreshAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Movie seed failed', false);
    } finally {
      setPendingAction(null);
    }
  };

  const handleUserSeed = async () => {
    try {
      setPendingAction('seed-users');
      const response = await usersApi.seed();
      showToast(response.message);
      await refreshAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'User seed failed', false);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <main className={styles.page}>
      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.ok ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className={`container ${styles.layout}`}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <Lock size={14} />
              Hidden Admin Control Room
            </span>
            <h1 className={styles.title}>Manage the Netflix-style experience without exposing the admin surface to viewers.</h1>
            <p className={styles.subtitle}>
              Content uploads, movie metadata, user blocking, and watch analytics all stay behind the secured admin login.
            </p>

            <div className={styles.heroActions}>
              <button className={styles.primaryBtn} onClick={openMovieCreate}>
                <Plus size={18} />
                Add Title
              </button>
              <button className={styles.secondaryBtn} onClick={openUserCreate}>
                <UserPlus size={18} />
                Add User
              </button>
              <button
                className={styles.ghostBtn}
                onClick={() => void refreshAll()}
                disabled={dashboardLoading || moviesLoading || usersLoading}
              >
                <RefreshCw size={16} />
                Refresh Data
              </button>
            </div>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.identityCard}>
              <div>
                <p className={styles.cardLabel}>Authenticated Admin</p>
                <h2 className={styles.cardTitle}>{admin?.name || 'Admin Session'}</h2>
                <p className={styles.cardMeta}>{admin?.email}</p>
              </div>
              <span className={styles.adminBadge}>
                <Shield size={14} />
                {admin?.role || 'admin'}
              </span>
            </div>

            <div className={styles.seedRow}>
              <button
                className={styles.seedBtn}
                onClick={handleMovieSeed}
                disabled={pendingAction === 'seed-movies'}
              >
                <Database size={16} />
                {pendingAction === 'seed-movies' ? 'Seeding titles...' : 'Seed Titles'}
              </button>
              <button
                className={styles.seedBtn}
                onClick={handleUserSeed}
                disabled={pendingAction === 'seed-users'}
              >
                <Users size={16} />
                {pendingAction === 'seed-users' ? 'Seeding users...' : 'Seed Users'}
              </button>
            </div>

            <div className={styles.lockedNote}>
              <span className={styles.lockDot} />
              This panel is only reachable after secure admin login or signup.
            </div>
          </div>
        </section>

        <section className={styles.metricGrid}>
          <MetricCard icon={<Clapperboard size={18} />} label="Titles" value={movieStats.totalTitles} accent="var(--accent)" />
          <MetricCard icon={<Film size={18} />} label="Movies / Shows" value={`${movieStats.totalMovies} / ${movieStats.totalShows}`} accent="#ffb24a" />
          <MetricCard icon={<Users size={18} />} label="Users" value={userStats.totalUsers} accent="#69d6aa" />
          <MetricCard icon={<Ban size={18} />} label="Blocked Users" value={userStats.blockedUsers} accent="#f97373" />
          <MetricCard icon={<Eye size={18} />} label="Views" value={compactNumber.format(movieStats.totalViews)} accent="#7fb3ff" />
          <MetricCard icon={<Download size={18} />} label="Downloads" value={compactNumber.format(movieStats.totalDownloads)} accent="#c399ff" />
        </section>

        {(dashboardError || moviesError || usersError) && (
          <div className={styles.errorBox}>
            {dashboardError || moviesError || usersError}
          </div>
        )}

        <section className={styles.analyticsGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.cardLabel}>Analytics</p>
                <h2 className={styles.panelTitle}>Top content by activity</h2>
              </div>
              <span className={styles.panelPill}>Views + downloads</span>
            </div>

            <div className={styles.listStack}>
              {dashboardLoading && Array.from({ length: 4 }).map((_, index) => (
                <div key={`top-content-${index}`} className="skeleton" style={{ height: 78, borderRadius: 18 }} />
              ))}

              {!dashboardLoading && (dashboard?.topContent?.length ?? 0) === 0 && (
                <div className={styles.emptyState}>No analytics yet. Once viewers start watching, the dashboard will populate here.</div>
              )}

              {!dashboardLoading && dashboard?.topContent.map((item) => (
                <div key={item.id} className={styles.contentItem}>
                  <img
                    src={item.posterUrl || 'https://placehold.co/64x96/13131a/444?text=Title'}
                    alt={item.title}
                    className={styles.contentPoster}
                    onError={(event) => {
                      (event.target as HTMLImageElement).src = 'https://placehold.co/64x96/13131a/444?text=Title';
                    }}
                  />
                  <div className={styles.contentMeta}>
                    <span className={styles.primaryText}>{item.title}</span>
                    <span className={styles.secondaryText}>
                      {item.contentType === 'tv' ? 'TV Show' : 'Movie'} · {item.category || 'General'}
                    </span>
                  </div>
                  <div className={styles.metricPills}>
                    <span className={styles.infoPill}><Eye size={13} /> {compactNumber.format(item.viewCount)}</span>
                    <span className={styles.infoPill}><Download size={13} /> {compactNumber.format(item.downloadCount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.cardLabel}>Timeline</p>
                <h2 className={styles.panelTitle}>Recent admin and viewer activity</h2>
              </div>
              <span className={styles.panelPill}>Live feed</span>
            </div>

            <div className={styles.listStack}>
              {dashboardLoading && Array.from({ length: 5 }).map((_, index) => (
                <div key={`activity-${index}`} className="skeleton" style={{ height: 68, borderRadius: 18 }} />
              ))}

              {!dashboardLoading && (dashboard?.recentActivity?.length ?? 0) === 0 && (
                <div className={styles.emptyState}>No activity entries yet.</div>
              )}

              {!dashboardLoading && dashboard?.recentActivity.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.cardLabel}>Users</p>
                <h2 className={styles.panelTitle}>Recently active accounts</h2>
              </div>
              <span className={styles.panelPill}>Last login</span>
            </div>

            <div className={styles.listStack}>
              {dashboardLoading && Array.from({ length: 4 }).map((_, index) => (
                <div key={`recent-user-${index}`} className="skeleton" style={{ height: 62, borderRadius: 18 }} />
              ))}

              {!dashboardLoading && (dashboard?.recentlyActiveUsers?.length ?? 0) === 0 && (
                <div className={styles.emptyState}>No recent user activity yet.</div>
              )}

              {!dashboardLoading && dashboard?.recentlyActiveUsers.map((user) => (
                <div key={user.id} className={styles.userActivityItem}>
                  <div>
                    <span className={styles.primaryText}>{user.name}</span>
                    <span className={styles.secondaryText}>{user.email}</span>
                  </div>
                  <div className={styles.userActivityMeta}>
                    <span className={styles.roleBadge}>{user.role}</span>
                    <span className={user.isBlocked ? styles.statusBlocked : user.isActive ? styles.statusActive : styles.statusMuted}>
                      {user.isBlocked ? 'Blocked' : user.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className={styles.secondaryText}>{formatDateTime(user.lastLoginAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.cardLabel}>Content Library</p>
              <h2 className={styles.sectionTitle}>Movies and TV show CRUD</h2>
              <p className={styles.sectionNote}>Create, edit, upload assets, seed, and remove titles from the streaming catalog.</p>
            </div>
            <button className={styles.primaryBtn} onClick={openMovieCreate}>
              <Plus size={18} />
              New Title
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Streams</th>
                  <th>Performance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {moviesLoading && Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`movie-skeleton-${index}`}>
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <td key={cellIndex}>
                        <div className="skeleton" style={{ height: 16, borderRadius: 6 }} />
                      </td>
                    ))}
                  </tr>
                ))}

                {!moviesLoading && movieData?.data.map((movie) => (
                  <tr key={movie.id}>
                    <td>
                      <div className={styles.rowMedia}>
                        <img
                          src={movie.posterUrl || 'https://placehold.co/52x78/13131a/444?text=Title'}
                          alt={movie.title}
                          className={styles.thumbImg}
                          onError={(event) => {
                            (event.target as HTMLImageElement).src = 'https://placehold.co/52x78/13131a/444?text=Title';
                          }}
                        />
                        <div>
                          <span className={styles.primaryText}>{movie.title}</span>
                          <span className={styles.secondaryText}>
                            {(movie.genre || []).slice(0, 3).join(', ') || 'No genres yet'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.stackCell}>
                        <span className={styles.typeBadge}>{movie.contentType === 'tv' ? 'TV Show' : 'Movie'}</span>
                        <span className={styles.secondaryText}>{movie.releaseDate ? movie.releaseDate.slice(0, 4) : 'TBD'}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.stackCell}>
                        <span className={styles.primaryText}>{movie.category || 'General'}</span>
                        <span className={styles.secondaryText}>{movie.language?.toUpperCase() || 'EN'}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.metricPills}>
                        <span className={`${styles.mediaBadge} ${movie.streamUrl ? styles.mediaReady : ''}`}>
                          <Play size={12} />
                          {movie.streamUrl ? 'Streaming' : 'No stream'}
                        </span>
                        <span className={`${styles.mediaBadge} ${movie.downloadUrl ? styles.mediaDownloadReady : ''}`}>
                          <Download size={12} />
                          {movie.downloadUrl ? 'Download' : 'No download'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.metricPills}>
                        <span className={styles.infoPill}><Eye size={13} /> {compactNumber.format(Number(movie.viewCount || 0))}</span>
                        <span className={styles.infoPill}><Download size={13} /> {compactNumber.format(Number(movie.downloadCount || 0))}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.actionRow}>
                        <button className={styles.iconBtn} onClick={() => openMovieEdit(movie)} title="Edit title">
                          <Pencil size={15} />
                        </button>
                        <button
                          className={styles.iconBtnDanger}
                          onClick={() => void handleMovieDelete(movie)}
                          disabled={pendingAction === `movie-${movie.id}`}
                          title="Delete title"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!moviesLoading && (movieData?.data.length ?? 0) === 0 && (
              <div className={styles.emptyState}>No titles yet. Add a movie or run the title seed to populate the catalog.</div>
            )}

            {movieData && movieData.meta.totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.paginationBtn}
                  disabled={moviePage === 1}
                  onClick={() => setMoviePage((current) => current - 1)}
                >
                  Previous
                </button>
                <span className={styles.paginationLabel}>
                  Page {moviePage} of {movieData.meta.totalPages}
                </span>
                <button
                  className={styles.paginationBtn}
                  disabled={moviePage === movieData.meta.totalPages}
                  onClick={() => setMoviePage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>

        <section className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.cardLabel}>Access Control</p>
              <h2 className={styles.sectionTitle}>User management</h2>
              <p className={styles.sectionNote}>Review accounts, block abusive users, edit subscriptions, and remove accounts when needed.</p>
            </div>
            <button className={styles.secondaryBtn} onClick={openUserCreate}>
              <UserPlus size={18} />
              New User
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role / Plan</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading && Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`user-skeleton-${index}`}>
                    {Array.from({ length: 5 }).map((__, cellIndex) => (
                      <td key={cellIndex}>
                        <div className="skeleton" style={{ height: 16, borderRadius: 6 }} />
                      </td>
                    ))}
                  </tr>
                ))}

                {!usersLoading && userData?.data.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.rowMedia}>
                        <img
                          src={user.avatarUrl || `https://placehold.co/48x48/1c1c28/f0f0f5?text=${encodeURIComponent(user.name.charAt(0).toUpperCase())}`}
                          alt={user.name}
                          className={styles.avatar}
                          onError={(event) => {
                            (event.target as HTMLImageElement).src = `https://placehold.co/48x48/1c1c28/f0f0f5?text=${encodeURIComponent(user.name.charAt(0).toUpperCase())}`;
                          }}
                        />
                        <div>
                          <span className={styles.primaryText}>{user.name}</span>
                          <span className={styles.secondaryText}>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.stackCell}>
                        <span className={styles.roleBadge}>{user.role}</span>
                        <span className={styles.planBadge}>{user.subscriptionPlan}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.metricPills}>
                        <span className={user.isActive ? styles.statusActive : styles.statusMuted}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className={user.isBlocked ? styles.statusBlocked : styles.statusOk}>
                          {user.isBlocked ? 'Blocked' : 'Open'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.secondaryText}>{formatDateTime(user.lastLoginAt)}</span>
                    </td>
                    <td>
                      <div className={styles.actionRow}>
                        <button
                          className={styles.iconBtnWarn}
                          onClick={() => void handleUserBlockToggle(user)}
                          disabled={pendingAction === `block-${user.id}` || admin?.id === user.id}
                          title={user.isBlocked ? 'Unblock user' : 'Block user'}
                        >
                          <Ban size={15} />
                        </button>
                        <button className={styles.iconBtn} onClick={() => openUserEdit(user)} title="Edit user">
                          <Pencil size={15} />
                        </button>
                        <button
                          className={styles.iconBtnDanger}
                          onClick={() => void handleUserDelete(user)}
                          disabled={pendingAction === `user-${user.id}` || admin?.id === user.id}
                          title="Delete user"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!usersLoading && (userData?.data.length ?? 0) === 0 && (
              <div className={styles.emptyState}>No users yet. Add one manually or run the sample-user seed.</div>
            )}

            {userData && userData.meta.totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.paginationBtn}
                  disabled={userPage === 1}
                  onClick={() => setUserPage((current) => current - 1)}
                >
                  Previous
                </button>
                <span className={styles.paginationLabel}>
                  Page {userPage} of {userData.meta.totalPages}
                </span>
                <button
                  className={styles.paginationBtn}
                  disabled={userPage === userData.meta.totalPages}
                  onClick={() => setUserPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {modalMode && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.cardLabel}>{modalMode.startsWith('movie') ? 'Title Editor' : 'User Editor'}</p>
                <h2 className={styles.modalTitle}>
                  {modalMode === 'movie-create' && 'Create a new title'}
                  {modalMode === 'movie-edit' && `Edit ${editingMovie?.title}`}
                  {modalMode === 'user-create' && 'Create a user account'}
                  {modalMode === 'user-edit' && `Edit ${editingUser?.name}`}
                </h2>
                <p className={styles.modalNote}>
                  {modalMode.startsWith('movie')
                    ? 'Upload artwork, streaming files, and metadata for the front-end library.'
                    : 'Adjust user roles, subscription plans, and access status.'}
                </p>
              </div>
              <button className={styles.closeBtn} onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {modalMode.startsWith('movie') ? (
                <MovieForm
                  form={movieForm}
                  setForm={setMovieForm}
                  uploading={uploading}
                  onUpload={handleMovieUpload}
                />
              ) : (
                <UserForm form={userForm} setForm={setUserForm} />
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.modalCancelBtn} onClick={closeModal}>Cancel</button>
              <button className={styles.modalSaveBtn} onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricIcon} style={{ color: accent }}>
        {icon}
      </div>
      <div>
        <span className={styles.metricValue}>{value}</span>
        <span className={styles.metricLabel}>{label}</span>
      </div>
    </article>
  );
}

function ActivityRow({ entry }: { entry: ActivityLog }) {
  return (
    <div className={styles.activityRow}>
      <div className={styles.activityIcon}>
        <Activity size={16} />
      </div>
      <div className={styles.activityCopy}>
        <span className={styles.primaryText}>{formatAction(entry.action)}</span>
        <span className={styles.secondaryText}>
          {entry.actorName || entry.details || 'CinemaFlow system'}
          {entry.subjectType ? ` on ${entry.subjectType}` : ''}
        </span>
      </div>
      <span className={styles.secondaryText}>{formatDateTime(entry.createdAt)}</span>
    </div>
  );
}

function MovieForm({
  form,
  setForm,
  uploading,
  onUpload,
}: {
  form: MovieFormData;
  setForm: React.Dispatch<React.SetStateAction<MovieFormData>>;
  uploading: Record<UploadField, boolean>;
  onUpload: (field: UploadField, file: File | undefined) => Promise<void>;
}) {
  const setListField = (field: 'genre' | 'cast', value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value.split(',').map((item) => item.trim()).filter(Boolean),
    }));
  };

  const handleFileChange = (field: UploadField) => async (event: ChangeEvent<HTMLInputElement>) => {
    await onUpload(field, event.target.files?.[0]);
    event.target.value = '';
  };

  return (
    <div className={styles.formGrid}>
      <Field label="Title *">
        <input
          className={styles.input}
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="Dune: Part Two"
        />
      </Field>

      <Field label="Content Type">
        <select
          className={styles.input}
          value={form.contentType}
          onChange={(event) => setForm((current) => ({ ...current, contentType: event.target.value as 'movie' | 'tv' }))}
        >
          <option value="movie">movie</option>
          <option value="tv">tv</option>
        </select>
      </Field>

      <Field label="Category">
        <input
          className={styles.input}
          value={form.category}
          onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
          placeholder="Binge Worthy"
        />
      </Field>

      <Field label="Director">
        <input
          className={styles.input}
          value={form.director}
          onChange={(event) => setForm((current) => ({ ...current, director: event.target.value }))}
          placeholder="Director or showrunner"
        />
      </Field>

      <Field label="Release Date">
        <input
          className={styles.input}
          type="date"
          value={form.releaseDate}
          onChange={(event) => setForm((current) => ({ ...current, releaseDate: event.target.value }))}
        />
      </Field>

      <Field label="Language">
        <input
          className={styles.input}
          value={form.language}
          onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
          placeholder="en"
        />
      </Field>

      <Field label="Rating">
        <input
          className={styles.input}
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={form.rating}
          onChange={(event) => setForm((current) => ({ ...current, rating: Number(event.target.value) }))}
        />
      </Field>

      <Field label="Runtime (mins)">
        <input
          className={styles.input}
          type="number"
          min="0"
          value={form.runtimeMinutes}
          onChange={(event) => setForm((current) => ({ ...current, runtimeMinutes: Number(event.target.value) }))}
        />
      </Field>

      <Field label="Vote Count">
        <input
          className={styles.input}
          type="number"
          min="0"
          value={form.voteCount}
          onChange={(event) => setForm((current) => ({ ...current, voteCount: Number(event.target.value) }))}
        />
      </Field>

      <Field label="View Count">
        <input
          className={styles.input}
          type="number"
          min="0"
          value={form.viewCount}
          onChange={(event) => setForm((current) => ({ ...current, viewCount: Number(event.target.value) }))}
        />
      </Field>

      <Field label="Download Count">
        <input
          className={styles.input}
          type="number"
          min="0"
          value={form.downloadCount}
          onChange={(event) => setForm((current) => ({ ...current, downloadCount: Number(event.target.value) }))}
        />
      </Field>

      <AssetField
        label="Poster URL"
        value={form.posterUrl}
        placeholder="/uploads/poster.jpg"
        uploading={uploading.posterUrl}
        uploadLabel={uploadFieldMeta.posterUrl.label}
        accept={uploadFieldMeta.posterUrl.accept}
        onChange={(value) => setForm((current) => ({ ...current, posterUrl: value }))}
        onFileChange={handleFileChange('posterUrl')}
      />

      <AssetField
        label="Backdrop URL"
        value={form.backdropUrl}
        placeholder="/uploads/backdrop.jpg"
        uploading={uploading.backdropUrl}
        uploadLabel={uploadFieldMeta.backdropUrl.label}
        accept={uploadFieldMeta.backdropUrl.accept}
        onChange={(value) => setForm((current) => ({ ...current, backdropUrl: value }))}
        onFileChange={handleFileChange('backdropUrl')}
      />

      <AssetField
        label="Stream URL"
        value={form.streamUrl}
        placeholder="/uploads/movie.mp4"
        uploading={uploading.streamUrl}
        uploadLabel={uploadFieldMeta.streamUrl.label}
        accept={uploadFieldMeta.streamUrl.accept}
        onChange={(value) => setForm((current) => ({ ...current, streamUrl: value }))}
        onFileChange={handleFileChange('streamUrl')}
        span
      />

      <AssetField
        label="Download URL"
        value={form.downloadUrl}
        placeholder="/uploads/movie-download.mp4"
        uploading={uploading.downloadUrl}
        uploadLabel={uploadFieldMeta.downloadUrl.label}
        accept={uploadFieldMeta.downloadUrl.accept}
        onChange={(value) => setForm((current) => ({ ...current, downloadUrl: value }))}
        onFileChange={handleFileChange('downloadUrl')}
        span
      />

      <Field label="Genres" span>
        <input
          className={styles.input}
          value={form.genre.join(', ')}
          onChange={(event) => setListField('genre', event.target.value)}
          placeholder="Action, Drama, Sci-Fi"
        />
      </Field>

      <Field label="Cast" span>
        <input
          className={styles.input}
          value={form.cast.join(', ')}
          onChange={(event) => setListField('cast', event.target.value)}
          placeholder="Actor One, Actor Two"
        />
      </Field>

      <Field label="Description" span>
        <textarea
          className={styles.textarea}
          rows={5}
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="A short synopsis that will appear on the user panel."
        />
      </Field>

      <Field label="Flags" span>
        <div className={styles.checkboxRow}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={form.isTrending}
              onChange={(event) => setForm((current) => ({ ...current, isTrending: event.target.checked }))}
            />
            Trending
          </label>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.checked }))}
            />
            Featured
          </label>
        </div>
      </Field>
    </div>
  );
}

function AssetField({
  label,
  value,
  placeholder,
  uploading,
  uploadLabel,
  accept,
  onChange,
  onFileChange,
  span = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  uploading: boolean;
  uploadLabel: string;
  accept: string;
  onChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  span?: boolean;
}) {
  return (
    <Field label={label} span={span}>
      <div className={styles.assetRow}>
        <input className={styles.input} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
        <label className={styles.uploadBtn}>
          <UploadCloud size={14} />
          {uploading ? 'Uploading...' : uploadLabel}
          <input type="file" accept={accept} onChange={onFileChange} hidden />
        </label>
      </div>
      <span className={styles.fieldHint}>{value ? value : 'Paste a URL or upload a local file.'}</span>
    </Field>
  );
}

function UserForm({
  form,
  setForm,
}: {
  form: UserFormData;
  setForm: React.Dispatch<React.SetStateAction<UserFormData>>;
}) {
  return (
    <div className={styles.formGrid}>
      <Field label="Name *">
        <input
          className={styles.input}
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Ava Thompson"
        />
      </Field>

      <Field label="Email *">
        <input
          className={styles.input}
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="ava@cinemaflow.app"
        />
      </Field>

      <Field label="Role">
        <select
          className={styles.input}
          value={form.role}
          onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
        >
          <option value="viewer">viewer</option>
          <option value="editor">editor</option>
          <option value="admin">admin</option>
        </select>
      </Field>

      <Field label="Subscription Plan">
        <select
          className={styles.input}
          value={form.subscriptionPlan}
          onChange={(event) => setForm((current) => ({ ...current, subscriptionPlan: event.target.value }))}
        >
          <option value="standard">standard</option>
          <option value="premium">premium</option>
          <option value="family">family</option>
          <option value="studio">studio</option>
        </select>
      </Field>

      <Field label="Avatar URL" span>
        <input
          className={styles.input}
          value={form.avatarUrl}
          onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))}
          placeholder="https://images.unsplash.com/..."
        />
      </Field>

      <Field label="Status" span>
        <div className={styles.checkboxRow}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Active account
          </label>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={form.isBlocked}
              onChange={(event) => setForm((current) => ({ ...current, isBlocked: event.target.checked }))}
            />
            Blocked
          </label>
        </div>
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
  span = false,
}: {
  label: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <label className={`${styles.field} ${span ? styles.fieldSpan : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function trimToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeList(values: string[]) {
  return values.map((item) => item.trim()).filter(Boolean);
}

function buildMoviePayload(form: MovieFormData) {
  return {
    title: form.title.trim(),
    description: trimToUndefined(form.description),
    posterUrl: trimToUndefined(form.posterUrl),
    backdropUrl: trimToUndefined(form.backdropUrl),
    streamUrl: trimToUndefined(form.streamUrl),
    downloadUrl: trimToUndefined(form.downloadUrl),
    contentType: form.contentType,
    category: trimToUndefined(form.category),
    releaseDate: form.releaseDate || undefined,
    rating: Number(form.rating) || 0,
    genre: normalizeList(form.genre),
    director: trimToUndefined(form.director),
    cast: normalizeList(form.cast),
    runtimeMinutes: Number(form.runtimeMinutes) || 0,
    language: trimToUndefined(form.language),
    isTrending: form.isTrending,
    isFeatured: form.isFeatured,
    voteCount: Number(form.voteCount) || 0,
    viewCount: Number(form.viewCount) || 0,
    downloadCount: Number(form.downloadCount) || 0,
  };
}

function buildUserPayload(form: UserFormData) {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    avatarUrl: trimToUndefined(form.avatarUrl),
    role: form.role,
    subscriptionPlan: form.subscriptionPlan,
    isActive: form.isActive,
    isBlocked: form.isBlocked,
  };
}

function formatAction(action: string) {
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'No activity yet';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
