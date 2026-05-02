const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../models/database');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

// All routes require auth
router.use(authenticate);

// GET /api/projects — list projects
router.get('/', (req, res) => {
  let projects;
  if (req.user.role === 'admin') {
    projects = db.prepare(`
      SELECT p.*,
        u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*,
        u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);
  }
  res.json(projects);
});

// POST /api/projects — create project
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim(),
  body('deadline').optional({ nullable: true }).isISO8601().withMessage('Invalid deadline date'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, deadline } = req.body;

  const result = db.prepare(`
    INSERT INTO projects (name, description, owner_id, deadline)
    VALUES (?, ?, ?, ?)
  `).run(name, description || null, req.user.id, deadline || null);

  // Auto-add creator as admin member
  db.prepare(`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (?, ?, 'admin')
  `).run(result.lastInsertRowid, req.user.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

// GET /api/projects/:id — get project + members
router.get('/:id', requireProjectAccess, (req, res) => {
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name
    FROM projects p
    JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
    ORDER BY pm.joined_at ASC
  `).all(req.params.id);

  res.json({ ...project, members });
});

// PUT /api/projects/:id — update project
router.put('/:id', requireProjectAccess, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('status').optional().isIn(['active', 'completed', 'archived']).withMessage('Invalid status'),
  body('deadline').optional({ nullable: true }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Only owner or admin can update
  if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the project owner or admin can update this project' });
  }

  const { name, description, status, deadline } = req.body;
  db.prepare(`
    UPDATE projects SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      deadline = ?
    WHERE id = ?
  `).run(name || null, description !== undefined ? description : null, status || null, deadline !== undefined ? deadline : project.deadline, req.params.id);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/projects/:id
router.delete('/:id', requireProjectAccess, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the project owner or admin can delete this project' });
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// POST /api/projects/:id/members — add member by email
router.post('/:id/members', requireProjectAccess, [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']).withMessage('Invalid role'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Only owner or admin can add members
  const requesterMember = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (project.owner_id !== req.user.id && req.user.role !== 'admin' && requesterMember?.role !== 'admin') {
    return res.status(403).json({ error: 'Only project admins can add members' });
  }

  const { email, role = 'member' } = req.body;
  const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found with that email' });

  const existing = db.prepare(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.id, user.id);
  if (existing) return res.status(400).json({ error: 'User is already a member' });

  db.prepare(`
    INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)
  `).run(req.params.id, user.id, role);

  res.status(201).json({ ...user, role });
});

// DELETE /api/projects/:id/members/:userId — remove member
router.delete('/:id/members/:userId', requireProjectAccess, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const requesterMember = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (project.owner_id !== req.user.id && req.user.role !== 'admin' && requesterMember?.role !== 'admin') {
    return res.status(403).json({ error: 'Only project admins can remove members' });
  }

  // Cannot remove the owner
  if (parseInt(req.params.userId) === project.owner_id) {
    return res.status(400).json({ error: 'Cannot remove the project owner' });
  }

  db.prepare(
    'DELETE FROM project_members WHERE project_id = ? AND user_id = ?'
  ).run(req.params.id, req.params.userId);

  res.json({ message: 'Deleted' });
});

module.exports = router;
