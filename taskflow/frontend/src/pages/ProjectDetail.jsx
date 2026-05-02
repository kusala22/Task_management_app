import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft, Plus, X, Trash2, Users, Calendar, Edit2,
  ChevronDown, UserPlus, CheckSquare, AlertTriangle,
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

function Avatar({ name, color, size = 26 }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  return (
    <div
      className="avatar"
      style={{ background: color || '#f5a623', width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

function StatusBadge({ status }) {
  const labels = { todo: 'Todo', in_progress: 'In Progress', review: 'Review', done: 'Done' };
  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}

function PriorityDot({ priority }) {
  return <span className={`priority-dot priority-${priority}`} />;
}

const PRIORITY_COLORS = { urgent: 'var(--red)', high: '#fb923c', medium: 'var(--accent)', low: 'var(--text-muted)' };

const COLUMNS = [
  { key: 'todo',        label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review',      label: 'Review' },
  { key: 'done',        label: 'Done' },
];

// ─── Task Modal ──────────────────────────────────────────────────────────────

function TaskModal({ projectId, members, task, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!task;
  const [form, setForm] = useState({
    title:       task?.title       || '',
    description: task?.description || '',
    status:      task?.status      || 'todo',
    priority:    task?.priority    || 'medium',
    assignee_id: task?.assignee_id ?? '',
    deadline:    task?.deadline    || '',
  });
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
      const payload = {
        ...form,
        project_id:  projectId,
        assignee_id: form.assignee_id !== '' ? Number(form.assignee_id) : null,
        deadline:    form.deadline || null,
      };
      let res;
      if (isEdit) {
        res = await api.put(`/tasks/${task.id}`, payload);
      } else {
        res = await api.post('/tasks', payload);
      }
      toast.success(isEdit ? 'Task updated' : 'Task created');
      onSaved(res.data, isEdit);
      onClose();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const map = {};
        apiErrors.forEach(e => { map[e.path] = e.msg; });
        setErrors(map);
      } else {
        toast.error(err.response?.data?.error || 'Failed to save task');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Task' : 'New Task'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                className={`form-input ${errors.title ? 'error' : ''}`}
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Task title"
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Optional details..."
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" name="status" value={form.status} onChange={handleChange}>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" name="priority" value={form.priority} onChange={handleChange}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-input" name="assignee_id" value={form.assignee_id} onChange={handleChange}>
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
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
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <Plus size={14} />}
              {isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Member Modal ────────────────────────────────────────────────────────

function AddMemberModal({ projectId, onClose, onAdded }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email, role });
      toast.success('Member added');
      onAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Add Member</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                className={`form-input ${error ? 'error' : ''}`}
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="user@example.com"
              />
              {error && <span className="form-error">{error}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <UserPlus size={14} />}
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({ task, onEdit, onDelete }) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = task.deadline && task.deadline < today && task.status !== 'done';

  return (
    <div
      className="card"
      style={{ padding: '12px 14px', cursor: 'default', marginBottom: 8 }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, flex: 1 }}>
          {task.title}
        </span>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: 3 }}
            onClick={() => onEdit(task)}
            title="Edit"
          >
            <Edit2 size={12} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: 3, color: 'var(--red)' }}
            onClick={() => onDelete(task)}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {task.description && (
        <p style={{
          fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {task.description}
        </p>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PriorityDot priority={task.priority} />
          <span style={{ fontSize: 11, color: PRIORITY_COLORS[task.priority], fontFamily: 'var(--font-mono)', textTransform: 'capitalize' }}>
            {task.priority}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {task.deadline && (
            <span
              style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
              className={isOverdue ? 'overdue' : ''}
            >
              <Calendar size={10} />
              {format(parseISO(task.deadline), 'MMM d')}
            </span>
          )}
          {task.assignee_name && (
            <Avatar name={task.assignee_name} color={task.assignee_color} size={20} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [project, setProject]   = useState(null);
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);

  const [showTaskModal, setShowTaskModal]     = useState(false);
  const [editingTask, setEditingTask]         = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [activeTab, setActiveTab]             = useState('board'); // 'board' | 'members'

  const loadData = useCallback(async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks/project/${id}`),
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const members = project?.members || [];
  const isOwnerOrAdmin = project && (project.owner_id === user?.id || user?.role === 'admin');

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  const doneCount  = tasks.filter(t => t.status === 'done').length;
  const totalCount = tasks.length;
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const today      = new Date().toISOString().split('T')[0];
  const overdueCount = tasks.filter(t => t.deadline && t.deadline < today && t.status !== 'done').length;

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleTaskSaved(savedTask, isEdit) {
    if (isEdit) {
      setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t));
    } else {
      setTasks(prev => [savedTask, ...prev]);
    }
  }

  async function handleDeleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      setTasks(prev => prev.filter(t => t.id !== task.id));
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete task');
    }
  }

  function handleMemberAdded(member) {
    setProject(prev => ({ ...prev, members: [...prev.members, member] }));
  }

  async function handleRemoveMember(memberId) {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await api.delete(`/projects/${id}/members/${memberId}`);
      setProject(prev => ({ ...prev, members: prev.members.filter(m => m.id !== memberId) }));
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="loading-center"><span className="spinner spinner-lg" /></div>;
  }

  if (!project) return null;

  const isOverdueProject = project.deadline && project.deadline < today && project.status !== 'completed';

  return (
    <div style={{ padding: '28px 32px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <Link
          to="/projects"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}
        >
          <ArrowLeft size={13} /> Back to Projects
        </Link>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600 }}>
                {project.name}
              </h1>
              <span className={`badge badge-${project.status}`}>{project.status}</span>
            </div>
            {project.description && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                {project.description}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckSquare size={13} />
                {doneCount}/{totalCount} tasks &nbsp;·&nbsp; {pct}%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Users size={13} />
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
              {project.deadline && (
                <span
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  className={isOverdueProject ? 'overdue' : ''}
                >
                  <Calendar size={13} />
                  {format(parseISO(project.deadline), 'MMM d, yyyy')}
                </span>
              )}
              {overdueCount > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--red)' }}>
                  <AlertTriangle size={13} />
                  {overdueCount} overdue
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {isOwnerOrAdmin && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMemberModal(true)}>
                <UserPlus size={13} /> Add Member
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>
              <Plus size={13} /> New Task
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-bar" style={{ marginTop: 16, height: 5 }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {[{ key: 'board', label: 'Board' }, { key: 'members', label: `Members (${members.length})` }].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Board Tab ── */}
      {activeTab === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, flex: 1, minHeight: 0 }}>
          {COLUMNS.map(col => {
            const colTasks = tasksByStatus[col.key];
            return (
              <div key={col.key} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10, padding: '0 2px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {col.label}
                    </span>
                    <span style={{
                      background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '1px 7px', fontSize: 11, color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: 3 }}
                    title={`Add ${col.label} task`}
                    onClick={() => {
                      setEditingTask({ status: col.key });
                      setShowTaskModal(true);
                    }}
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Cards */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>
                  {colTasks.length === 0 ? (
                    <div style={{
                      border: '1px dashed var(--border)', borderRadius: 8,
                      padding: '20px 12px', textAlign: 'center',
                      color: 'var(--text-muted)', fontSize: 12,
                    }}>
                      No tasks
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={t => { setEditingTask(t); setShowTaskModal(true); }}
                        onDelete={handleDeleteTask}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Members Tab ── */}
      {activeTab === 'members' && (
        <div style={{ maxWidth: 600 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {members.length === 0 ? (
              <div className="empty-state">No members yet</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    {isOwnerOrAdmin && <th />}
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={m.name} color={m.avatar_color} size={28} />
                          <span style={{ fontWeight: 500 }}>{m.name}</span>
                          {m.id === project.owner_id && (
                            <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                              owner
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.email}</td>
                      <td>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: m.role === 'admin' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                          {m.role}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {format(parseISO(m.joined_at), 'MMM d, yyyy')}
                      </td>
                      {isOwnerOrAdmin && (
                        <td>
                          {m.id !== project.owner_id && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: 4, color: 'var(--red)' }}
                              onClick={() => handleRemoveMember(m.id)}
                              title="Remove member"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showTaskModal && (
        <TaskModal
          projectId={Number(id)}
          members={members}
          task={editingTask?.title !== undefined ? editingTask : (editingTask?.status ? { status: editingTask.status } : null)}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSaved={handleTaskSaved}
        />
      )}

      {showMemberModal && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowMemberModal(false)}
          onAdded={handleMemberAdded}
        />
      )}
    </div>
  );
}
