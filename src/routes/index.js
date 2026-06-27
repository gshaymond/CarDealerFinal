import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getInventory, getVehicle } from '../controllers/vehicleController.js';

const router = express.Router();

// GET / - Home page
router.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

// GET /vehicles - Inventory page
router.get('/vehicles', getInventory);

// GET /vehicle/:id and /vehicles/:id - Vehicle detail page
router.get(['/vehicle/:id', '/vehicles/:id'], getVehicle);

// GET /dashboard - Dashboard page (requires authentication)
router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { title: 'Dashboard' });
});

// GET /admin - Admin page (requires authentication and admin role)
router.get('/owner', requireAuth, requireRole('owner'), (req, res) => {
  res.render('dashboard', { title: 'Owner Dashboard' });
});

export default router;