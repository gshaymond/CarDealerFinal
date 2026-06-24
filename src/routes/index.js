import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { title: 'Dashboard' });
});

router.get('/owner', requireAuth, requireRole('owner'), (req, res) => {
  res.render('dashboard', { title: 'Owner Dashboard' });
});

export default router;