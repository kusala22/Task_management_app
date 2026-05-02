import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Plus, Search, FolderKanban, Users, X, Calendar } from 'lucide-react';
import api from '../api';
import { useToast } from '../context/ToastContext';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function ProjectModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', description: '', deadline: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/projects', {
        ...form,
        deadline: form.deadline || null,
      });
      toast.success('Project created');
      onCreated(res.data);
      onClose();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const map = {};
        apiErrors.forEach(e => { map[e.path] = e.msg; });
        setErrors(map);
      } else {
        toast.error(err.response?.data?.error || 'Failed to create project');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Project</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                className={`form-input ${errors.name ? 'error' : ''}`}
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Project name"
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="What is this project about?"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input
                className="form-input"
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <Plus size={14} />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get('/projects').then(res => setProjects(res.data)).finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="loading-center"><span className="spinner spinner-lg" /></div>;
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Projects</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} />
          New Project
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 24, maxWidth: 320 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 32 }}
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <FolderKanban size={40} />
          <div style={{ fontSize: 15, fontWeight: 500 }}>No projects found</div>
          <div style={{ fontSize: 13 }}>Create your first project to get started</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(project => {
            const pct = project.task_count > 0
              ? Math.round((project.done_count / project.task_count) * 100)
              : 0;
            const isOverdue = project.deadline && project.deadline < new Date().toISOString().split('T')[0] && project.status !== 'completed';

            return (
              <Link key={project.id} to={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s', height: '100%' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', flex: 1, marginRight: 8 }}>
                      {project.name}
                    </h3>
                    <StatusBadge status={project.status} />
                  </div>

                  {project.description && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.description}
                    </p>
                  )}

                  {/* Progress */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
                      <span>{project.done_count}/{project.task_count} tasks</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} />
                      {project.member_count}
                    </span>
                    {project.deadline && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }} className={isOverdue ? 'overdue' : ''}>
                        <Calendar size={12} />
                        {format(parseISO(project.deadline), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && (
        <ProjectModal
          onClose={() => setShowModal(false)}
          onCreated={p => setProjects(prev => [p, ...prev])}
        />
      )}
    </div>
  );
}
