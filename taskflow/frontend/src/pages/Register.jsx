import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      const res = await api.post('/auth/register', form);
      login(res.data.token, res.data.user);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const map = {};
        apiErrors.forEach(e => { map[e.path] = e.msg; });
        setErrors(map);
      } else {
        toast.error(err.response?.data?.error || 'Registration failed');
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
            Create your account
          </div>
        </div>

        <div className="card">
          <h1 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 20,
          }}>
            Register
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className={`form-input ${errors.name ? 'error' : ''}`}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                autoComplete="name"
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

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
                placeholder="Min. 6 characters"
                autoComplete="new-password"
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: 4, justifyContent: 'center' }}
            >
              {loading ? <span className="spinner" /> : <UserPlus size={15} />}
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
