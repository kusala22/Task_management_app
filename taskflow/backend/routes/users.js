const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../models/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// GET /api/users — list all users
router.get('/', (req, res) => {
  const users = db.prepare(
    'SELECT id, name, email, role, avatar_color, created_at FROM users ORDER BY name ASC'
  ).all();
  res.json(users);
});

// PUT /api/users/me — update own name
router.put('/me', [
  body('name').trim().notEmpty().withMessage('Name is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(req.body.name, req.user.id);
  const user = db.prepare('SELECT id, name, email, role, avatar_color FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// PUT /api/users/:id/role — admin only
router.put('/:id/role', requireAdmin, [
  body('role').isIn(['admin', 'member']).withMessage('Role must be admin or member'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(req.body.role, req.params.id);
  const updated = db.prepare('SELECT id, name, email, role, avatar_color FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
