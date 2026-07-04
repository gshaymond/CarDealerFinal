import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getInventory, getVehicle } from '../controllers/vehicleController.js';
import {
  createReview,
  createServiceRequest,
  deleteReview,
  getDashboard,
} from '../controllers/customerController.js';

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
router.get('/dashboard', requireAuth, getDashboard);

// POST /vehicles/:id/reviews - Create or update the signed-in user's review
router.post('/vehicles/:id/reviews', requireAuth, createReview);

// POST /reviews/:id/delete - Delete the signed-in user's review
router.post('/reviews/:id/delete', requireAuth, deleteReview);

// POST /vehicles/:id/service-requests - Submit a service request for a vehicle
router.post('/vehicles/:id/service-requests', requireAuth, createServiceRequest);

// GET /admin - Admin page (requires authentication and admin role)
router.get('/owner', requireAuth, requireRole('owner'), getDashboard);

export default router;