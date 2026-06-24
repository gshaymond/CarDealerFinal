import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET / - Home page
router.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

// GET /dashboard - Dashboard page (requires authentication)
router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { title: 'Dashboard' });
});

// GET /admin - Admin page (requires authentication and admin role)
router.get('/owner', requireAuth, requireRole('owner'), (req, res) => {
  res.render('dashboard', { title: 'Owner Dashboard' });
});

export default router;