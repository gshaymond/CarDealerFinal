import express from 'express';
import {
	flagReview,
	getContactMessages,
	getReviewModeration,
	getServiceRequestDetail,
	getServiceRequests,
	getStaffDashboard,
	getVehicleEdit,
	removeReview,
	updateContactMessage,
	updateServiceRequest,
	updateVehicle,
} from '../controllers/staffController.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireRole('secondary', 'owner'));

router.get('/', getStaffDashboard);

router.get('/vehicles/:id/edit', getVehicleEdit);
router.post('/vehicles/:id', updateVehicle);

router.get('/reviews', getReviewModeration);
router.post('/reviews/:id/flag', flagReview);
router.post('/reviews/:id/remove', removeReview);

router.get('/service-requests', getServiceRequests);
router.get('/service-requests/:id', getServiceRequestDetail);
router.post('/service-requests/:id', updateServiceRequest);

router.get('/contact-messages', getContactMessages);
router.post('/contact-messages/:id', updateContactMessage);

export default router;