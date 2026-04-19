import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import styles from './AdminAuthPage.module.css';

type AuthMode = 'login' | 'signup';

export default function AdminAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, isAuthenticated } = useAdminAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    signupKey: '',
    avatarUrl: '',
  });

  const targetPath = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || '/admin';
  }, [location.state]);

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        if (form.password !== form.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        await signup({
          name: form.name,
          email: form.email,
          password: form.password,
          signupKey: form.signupKey,
          avatarUrl: form.avatarUrl || undefined,
        });
      }

      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>
            <ShieldCheck size={16} />
            Hidden Admin Access
          </span>
          <h1 className={styles.title}>Secure the CinemaFlow control room.</h1>
          <p className={styles.subtitle}>
            The admin panel stays invisible to normal users. Only authenticated admins can manage content,
            uploads, analytics, and user controls.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.modeSwitch}>
            <button
              className={`${styles.modeBtn} ${mode === 'login' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('login')}
              type="button"
            >
              Login
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'signup' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('signup')}
              type="button"
            >
              Signup
            </button>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <Field label="Admin Name">
                <input
                  className={styles.input}
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  required
                />
              </Field>
            )}

            <Field label="Email">
              <input
                className={styles.input}
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                required
              />
            </Field>

            <Field label="Password">
              <input
                className={styles.input}
                type="password"
                value={form.password}
                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                required
                minLength={8}
              />
            </Field>

            {mode === 'signup' && (
              <>
                <Field label="Confirm Password">
                  <input
                    className={styles.input}
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                    required
                    minLength={8}
                  />
                </Field>

                <Field label="Admin Signup Key">
                  <input
                    className={styles.input}
                    type="password"
                    value={form.signupKey}
                    onChange={(e) => setForm((current) => ({ ...current, signupKey: e.target.value }))}
                    required
                  />
                </Field>

                <Field label="Avatar URL (Optional)">
                  <input
                    className={styles.input}
                    value={form.avatarUrl}
                    onChange={(e) => setForm((current) => ({ ...current, avatarUrl: e.target.value }))}
                  />
                </Field>
              </>
            )}

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.submitBtn} type="submit" disabled={submitting}>
              <LockKeyhole size={16} />
              {submitting ? 'Verifying...' : mode === 'login' ? 'Enter Admin Panel' : 'Create Admin Account'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}
