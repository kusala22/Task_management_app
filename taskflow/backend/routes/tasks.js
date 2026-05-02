const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../models/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const PRIORITY_ORDER = "CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END";

// GET /api/tasks — all tasks visible to user
router.get('/', (req, res) => {
  let tasks;
  if (req.user.role === 'admin') {
    tasks = db.prepare(`
      SELECT t.*, 
        u.name as assignee_name, u.avatar_color as assignee_color,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      JOIN projects p ON t.project_id = p.id
      ORDER BY ${PRIORITY_ORDER}, t.created_at DESC
    `).all();
  } else {
    tasks = db.prepare(`
      SELECT t.*,
        u.name as assignee_name, u.avatar_color as assignee_color,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      JOIN projects p ON t.project_id = p.id
      JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
      ORDER BY ${PRIORITY_ORDER}, t.created_at DESC
    `).all(req.user.id);
  }
  res.json(tasks);
});

// GET /api/tasks/dashboard — stats
router.get('/dashboard', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const projectFilter = isAdmin
    ? ''
    : 'JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ' + userId;

  const projectCountFilter = isAdmin
    ? 'SELECT COUNT(*) as count FROM projects'
    : `SELECT COUNT(*) as count FROM projects p JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${userId}`;

  const total = db.prepare(`SELECT COUNT(*) as count FROM tasks t ${projectFilter}`).get().count;
  const done = db.prepare(`SELECT COUNT(*) as count FROM tasks t ${projectFilter} WHERE t.status = 'done'`).get().count;
  const overdue = db.prepare(`
    SELECT COUNT(*) as count FROM tasks t ${projectFilter}
    WHERE t.deadline < ? AND t.status != 'done'
  `).get(today).count;

  const myTasks = db.prepare(`
    SELECT COUNT(*) as count FROM tasks t ${projectFilter}
    WHERE t.assignee_id = ?
  `).get(userId).count;

  const projectCount = db.prepare(projectCountFilter).get().count;

  const byStatus = db.prepare(`
    SELECT t.status, COUNT(*) as count FROM tasks t ${projectFilter}
    GROUP BY t.status
  `).all();

  const recentTasks = db.prepare(`
    SELECT t.*, 
      u.name as assignee_name, u.avatar_color as assignee_color,
      p.name as project_name
    FROM tasks t ${projectFilter}
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN projects p ON t.project_id = p.id
    ORDER BY t.created_at DESC
    LIMIT 10
  `).all();

  res.json({
    total,
    done,
    overdue,
    myTasks,
    projectCount,
    byStatus,
    recentTasks,
  });
});

// GET /api/tasks/project/:projectId — tasks for a project
router.get('/project/:projectId', (req, res) => {
  // Check access
  if (req.user.role !== 'admin') {
    const member = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.projectId, req.user.id);
    if (!member) return res.status(403).json({ error: 'Access denied' });
  }

  const tasks = db.prepare(`
    SELECT t.*,
      u.name as assignee_name, u.avatar_color as assignee_color,
      cu.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN users cu ON t.created_by = cu.id
    WHERE t.project_id = ?
    ORDER BY ${PRIORITY_ORDER}, t.created_at DESC
  `).all(req.params.projectId);

  res.json(tasks);
});

// POST /api/tasks — create task
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('project_id').isInt().withMessage('Project ID required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('deadline').optional({ nullable: true }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  // Check project access
  if (req.user.role !== 'admin') {
    const member = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.body.project_id, req.user.id);
    if (!member) return res.status(403).json({ error: 'Access denied' });
  }

  const { title, description, project_id, assignee_id, priority = 'medium', status = 'todo', deadline } = req.body;

  const result = db.prepare(`
    INSERT INTO tasks (title, description, project_id, assignee_id, created_by, priority, status, deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, project_id, assignee_id || null, req.user.id, priority, status, deadline || null);

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(task);
});

// PUT /api/tasks/:id — update task
router.put('/:id', [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Check project access
  if (req.user.role !== 'admin') {
    const member = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(task.project_id, req.user.id);
    if (!member) return res.status(403).json({ error: 'Access denied' });
  }

  const { title, description, status, priority, assignee_id, deadline } = req.body;

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      assignee_id = ?,
      deadline = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || null,
    description !== undefined ? description : null,
    status || null,
    priority || null,
    assignee_id !== undefined ? (assignee_id || null) : task.assignee_id,
    deadline !== undefined ? (deadline || null) : task.deadline,
    req.params.id
  );

  const updated = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.id = ?
  `).get(req.params.id);

  res.json(updated);
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (task.created_by !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the task creator or admin can delete this task' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// GET /api/tasks/:id/comments
router.get('/:id/comments', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = db.prepare(`
    SELECT tc.*, u.name as user_name, u.avatar_color
    FROM task_comments tc
    JOIN users u ON tc.user_id = u.id
    WHERE tc.task_id = ?
    ORDER BY tc.created_at ASC
  `).all(req.params.id);

  res.json(comments);
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', [
  body('content').trim().notEmpty().withMessage('Comment content is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const result = db.prepare(`
    INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)
  `).run(req.params.id, req.user.id, req.body.content);

  const comment = db.prepare(`
    SELECT tc.*, u.name as user_name, u.avatar_color
    FROM task_comments tc
    JOIN users u ON tc.user_id = u.id
    WHERE tc.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(comment);
});

module.exports = router;
