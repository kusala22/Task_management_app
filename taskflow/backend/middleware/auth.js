const jwt = require('jsonwebtoken');
const db = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_key_change_in_production';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role, avatar_color FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireProjectAccess(req, res, next) {
  // Admin bypasses project access check
  if (req.user.role === 'admin') return next();

  const projectId = req.params.projectId || req.params.id || req.body.project_id;
  if (!projectId) return res.status(400).json({ error: 'Project ID required' });

  const member = db.prepare(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, req.user.id);

  if (!member) {
    return res.status(403).json({ error: 'Access denied: not a project member' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireProjectAccess, JWT_SECRET };
