import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const map = {};
        apiErrors.forEach(e => { map[e.path] = e.msg; });
        setErrors(map);
      } else {
        toast.error(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--accent)',
            marginBottom: 8,
          }}>
            taskflow_
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Project management for teams
          </div>
        </div>

        <div className="card">
          <h1 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 20,
            color: 'var(--text-primary)',
          }}>
            Sign in
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className={`form-input ${errors.email ? 'error' : ''}`}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className={`form-input ${errors.password ? 'error' : ''}`}
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: 4, justifyContent: 'center' }}
            >
              {loading ? <span className="spinner" /> : <LogIn size={15} />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{
            marginTop: 16,
            padding: '12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 6,
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
              DEMO CREDENTIALS
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--accent)' }}>admin@taskflow.dev</span>
              {' / '}
              <span style={{ color: 'var(--text-secondary)' }}>admin123</span>
            </div>
          </div>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)' }}>
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
