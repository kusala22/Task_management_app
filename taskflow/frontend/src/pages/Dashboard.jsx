import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isPast, parseISO } from 'date-fns';
import { CheckSquare, FolderKanban, User, AlertTriangle } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{ color: accent || 'var(--text-muted)' }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: accent || 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
      )}
    </div>
  );
}

function PriorityDot({ priority }) {
  return <span className={`priority-dot priority-${priority}`} />;
}

function StatusBadge({ status }) {
  const labels = { todo: 'Todo', in_progress: 'In Progress', review: 'Review', done: 'Done' };
  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}

function Avatar({ name, color, size = 24 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  return (
    <div className="avatar" style={{ background: color || '#f5a623', width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/dashboard').then(res => {
      setStats(res.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-center">
        <span className="spinner spinner-lg" />
      </div>
    );
  }

  const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const statusList = [
    { key: 'todo', label: 'Todo', color: 'var(--text-secondary)' },
    { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
    { key: 'review', label: 'Review', color: 'var(--purple)' },
    { key: 'done', label: 'Done', color: 'var(--green)' },
  ];

  function getStatusCount(key) {
    return stats.byStatus.find(s => s.status === key)?.count || 0;
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Welcome back, {user?.name}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard
          icon={<CheckSquare size={18} />}
          label="Total Tasks"
          value={stats.total}
          sub={
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{completionPct}% complete</span>
                <span>{stats.done}/{stats.total}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
          }
        />
        <StatCard
          icon={<FolderKanban size={18} />}
          label="Projects"
          value={stats.projectCount}
          accent="var(--blue)"
        />
        <StatCard
          icon={<User size={18} />}
          label="My Tasks"
          value={stats.myTasks}
          accent="var(--purple)"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Overdue"
          value={stats.overdue}
          accent={stats.overdue > 0 ? 'var(--red)' : undefined}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Status breakdown */}
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            By Status
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {statusList.map(s => {
              const count = getStatusCount(s.key);
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={s.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                    <span style={{ color: s.color, fontFamily: 'var(--font-mono)' }}>{s.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent tasks */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent Tasks
            </h2>
          </div>
          {stats.recentTasks.length === 0 ? (
            <div className="empty-state">No tasks yet</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTasks.map(task => {
                  const isOverdue = task.deadline && task.deadline < today && task.status !== 'done';
                  return (
                    <tr key={task.id}>
                      <td style={{ fontWeight: 500, maxWidth: 200 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {task.title}
                        </span>
                      </td>
                      <td>
                        <Link to={`/projects/${task.project_id}`} style={{ color: 'var(--accent)', fontSize: 12 }}>
                          {task.project_name}
                        </Link>
                      </td>
                      <td><StatusBadge status={task.status} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <PriorityDot priority={task.priority} />
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{task.priority}</span>
                        </div>
                      </td>
                      <td>
                        {task.assignee_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Avatar name={task.assignee_name} color={task.assignee_color} size={22} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.assignee_name}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        {task.deadline ? (
                          <span className={isOverdue ? 'overdue' : ''} style={{ fontSize: 12 }}>
                            {format(parseISO(task.deadline), 'MMM d')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
