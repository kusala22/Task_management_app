const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../models/database');
const { JWT_SECRET } = require('../middleware/auth');

const AVATAR_COLORS = [
  '#f5a623', '#22c55e', '#3b82f6', '#a855f7',
  '#ef4444', '#14b8a6', '#f43f5e', '#fb923c'
];

function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ errors: [{ msg: 'Email already in use', path: 'email' }] });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const avatarColor = randomAvatarColor();

  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, avatar_color)
    VALUES (?, ?, ?, 'member', ?)
  `).run(name, email, hashedPassword, avatarColor);

  const user = db.prepare('SELECT id, name, email, role, avatar_color FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ errors: [{ msg: 'Invalid email or password', path: 'email' }] });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ errors: [{ msg: 'Invalid email or password', path: 'password' }] });
  }

  const { password: _, ...safeUser } = user;
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user: safeUser });
});

module.exports = router;
