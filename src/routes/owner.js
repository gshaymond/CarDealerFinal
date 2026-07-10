import express from 'express';
import {
	addVehicleImage,
	createCategory,
	createVehicle,
	deleteCategory,
	deleteVehicle,
	deleteVehicleImage,
	getCategories,
	getContactMessages,
	getOwnerDashboard,
	getReviews,
	getServiceRequests,
	getUsers,
	getVehicleEdit,
	getVehicleNew,
	getVehicles,
	updateCategory,
	updateUserRole,
	updateVehicle,
} from '../controllers/ownerController.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireRole('owner'));

router.get('/', getOwnerDashboard);

router.get('/users', getUsers);
router.post('/users/:id/role', updateUserRole);

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.post('/categories/:id', updateCategory);
router.post('/categories/:id/delete', deleteCategory);

router.get('/vehicles', getVehicles);
router.get('/vehicles/new', getVehicleNew);
router.post('/vehicles', createVehicle);
router.get('/vehicles/:id/edit', getVehicleEdit);
router.post('/vehicles/:id', updateVehicle);
router.post('/vehicles/:id/delete', deleteVehicle);
router.post('/vehicles/:id/images', addVehicleImage);
router.post('/vehicle-images/:id/delete', deleteVehicleImage);

router.get('/reviews', getReviews);
router.get('/service-requests', getServiceRequests);
router.get('/contact-messages', getContactMessages);

export default router;