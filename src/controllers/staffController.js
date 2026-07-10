import pool from '../db.js';

const REVIEW_ACTIONS = {
	flag: { status: 'Flagged', note: 'Marked as needing review by staff.' },
	remove: { status: 'Removed', note: 'Removed from public view by staff.' },
};

const SERVICE_REQUEST_STATUSES = ['Submitted', 'In Progress', 'Waiting on Customer', 'Completed', 'Closed'];
const CONTACT_MESSAGE_STATUSES = ['New', 'Reviewed', 'Closed'];

function normalizeText(value) {
	return (value || '').trim();
}

function normalizeBoolean(value) {
	return ['true', '1', 'on', 'yes'].includes(String(value).toLowerCase());
}

function normalizeAllowedStatus(value, allowedStatuses) {
	const normalized = normalizeText(value);
	return allowedStatuses.find((status) => status.toLowerCase() === normalized.toLowerCase()) || null;
}

async function loadVehicle(vehicleId) {
	const [vehicleResult, categoriesResult] = await Promise.all([
		pool.query(
			`
				SELECT
					v.id,
					v.category_id,
					v.year,
					v.make,
					v.model,
					v.mileage,
					v.price,
					v.description,
					v.is_available,
					c.name AS category_name
				FROM vehicles v
				LEFT JOIN categories c ON c.id = v.category_id
				WHERE v.id = $1
			`,
			[vehicleId]
		),
		pool.query('SELECT id, name FROM categories ORDER BY name ASC'),
	]);

	return {
		vehicle: vehicleResult.rows[0] || null,
		categories: categoriesResult.rows,
	};
}

async function loadStaffSummary() {
	const [summaryResult, vehiclesResult, reviewsResult, requestsResult, messagesResult] = await Promise.all([
		pool.query(
			`
				SELECT
					(SELECT COUNT(*) FROM vehicles WHERE is_available = TRUE) AS available_vehicles,
					(SELECT COUNT(*) FROM reviews WHERE status IN ('Pending', 'Flagged')) AS needs_review,
					(SELECT COUNT(*) FROM service_requests WHERE status IN ('Submitted', 'In Progress', 'Waiting on Customer')) AS open_requests,
					(SELECT COUNT(*) FROM contact_messages WHERE status = 'New') AS new_messages
				`
		),
		pool.query(
			`
				SELECT id, year, make, model, price, is_available, created_at
				FROM vehicles
				ORDER BY created_at DESC, id DESC
				LIMIT 5
			`
		),
		pool.query(
			`
				SELECT
					r.id,
					r.rating,
					r.comment,
					r.status,
					r.created_at,
					u.display_name,
					v.id AS vehicle_id,
					v.year,
					v.make,
					v.model,
					(
						SELECT action
						FROM review_moderation_actions a
						WHERE a.review_id = r.id
						ORDER BY a.created_at DESC, a.id DESC
						LIMIT 1
					) AS last_action
				FROM reviews r
				LEFT JOIN users u ON u.id = r.user_id
				LEFT JOIN vehicles v ON v.id = r.vehicle_id
				ORDER BY r.created_at DESC, r.id DESC
				LIMIT 5
			`
		),
		pool.query(
			`
				SELECT
					sr.id,
					sr.service_type,
					sr.status,
					sr.created_at,
					sr.internal_notes,
					u.display_name,
					v.id AS vehicle_id,
					v.year,
					v.make,
					v.model
				FROM service_requests sr
				LEFT JOIN users u ON u.id = sr.user_id
				LEFT JOIN vehicles v ON v.id = sr.vehicle_id
				ORDER BY sr.created_at DESC, sr.id DESC
				LIMIT 5
			`
		),
		pool.query(
			`
				SELECT id, name, email, message, status, staff_note, updated_at, created_at
				FROM contact_messages
				ORDER BY created_at DESC, id DESC
				LIMIT 5
			`
		),
	]);

	return {
		summary: summaryResult.rows[0] || {
			available_vehicles: 0,
			needs_review: 0,
			open_requests: 0,
			new_messages: 0,
		},
		recentVehicles: vehiclesResult.rows,
		recentReviews: reviewsResult.rows,
		recentRequests: requestsResult.rows,
		recentMessages: messagesResult.rows,
	};
}

async function loadServiceRequest(requestId) {
	const [requestResult, historyResult] = await Promise.all([
		pool.query(
			`
				SELECT
					sr.id,
					sr.service_type,
					sr.notes,
					sr.internal_notes,
					sr.status,
					sr.created_at,
					u.display_name,
					u.email,
					v.id AS vehicle_id,
					v.year,
					v.make,
					v.model
				FROM service_requests sr
				LEFT JOIN users u ON u.id = sr.user_id
				LEFT JOIN vehicles v ON v.id = sr.vehicle_id
				WHERE sr.id = $1
			`,
			[requestId]
		),
		pool.query(
			`
				SELECT status, note, created_at
				FROM service_request_history
				WHERE service_request_id = $1
				ORDER BY created_at ASC, id ASC
			`,
			[requestId]
		),
	]);

	return {
		request: requestResult.rows[0] || null,
		history: historyResult.rows,
	};
}

async function loadContactMessages() {
	const result = await pool.query(
		`
			SELECT id, name, email, message, status, staff_note, updated_at, created_at
			FROM contact_messages
			ORDER BY created_at DESC, id DESC
		`
	);

	return result.rows;
}

export async function getStaffDashboard(req, res, next) {
	try {
		const data = await loadStaffSummary();

		return res.render('staff/dashboard', {
			title: 'Staff Dashboard',
			...data,
		});
	} catch (error) {
		return next(error);
	}
}

export async function getVehicleEdit(req, res, next) {
	try {
		const vehicleId = Number.parseInt(req.params.id, 10);

		if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
			return res.status(400).render('error', {
				title: 'Invalid Vehicle',
				message: 'That vehicle link is not valid.',
			});
		}

		const data = await loadVehicle(vehicleId);

		if (!data.vehicle) {
			return res.status(404).render('error', {
				title: 'Vehicle Not Found',
				message: 'No vehicle was found for that listing yet.',
			});
		}

		return res.render('staff/vehicle-edit', {
			title: 'Edit Vehicle',
			vehicle: data.vehicle,
			categories: data.categories,
			error: null,
			form: {
				price: data.vehicle.price,
				description: data.vehicle.description,
				isAvailable: data.vehicle.is_available,
			},
		});
	} catch (error) {
		return next(error);
	}
}

export async function updateVehicle(req, res, next) {
	try {
		const vehicleId = Number.parseInt(req.params.id, 10);
		const price = Number.parseFloat(String(req.body.price || '').trim());
		const description = normalizeText(req.body.description);
		const isAvailable = normalizeBoolean(req.body.isAvailable);

		if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
			return res.status(400).render('error', {
				title: 'Invalid Vehicle',
				message: 'That vehicle link is not valid.',
			});
		}

		const data = await loadVehicle(vehicleId);

		if (!data.vehicle) {
			return res.status(404).render('error', {
				title: 'Vehicle Not Found',
				message: 'No vehicle was found for that listing yet.',
			});
		}

		if (!Number.isFinite(price) || price < 0) {
			return res.status(400).render('staff/vehicle-edit', {
				title: 'Edit Vehicle',
				vehicle: data.vehicle,
				categories: data.categories,
				error: 'Enter a valid price.',
				form: { price: req.body.price, description, isAvailable },
			});
		}

		await pool.query(
			`
				UPDATE vehicles
				SET price = $1,
					description = $2,
					is_available = $3
				WHERE id = $4
			`,
			[price, description, isAvailable, vehicleId]
		);

		req.session.notice = 'Vehicle details were updated.';
		return res.redirect(`/staff/vehicles/${vehicleId}/edit`);
	} catch (error) {
		return next(error);
	}
}

export async function getReviewModeration(req, res, next) {
	try {
		const result = await pool.query(
			`
				SELECT
					r.id,
					r.rating,
					r.comment,
					r.status,
					r.created_at,
					u.display_name,
					v.id AS vehicle_id,
					v.year,
					v.make,
					v.model,
					(
						SELECT action
						FROM review_moderation_actions a
						WHERE a.review_id = r.id
						ORDER BY a.created_at DESC, a.id DESC
						LIMIT 1
					) AS last_action
				FROM reviews r
				LEFT JOIN users u ON u.id = r.user_id
				LEFT JOIN vehicles v ON v.id = r.vehicle_id
				ORDER BY r.created_at DESC, r.id DESC
			`
		);

		return res.render('staff/reviews', {
			title: 'Review Moderation',
			reviews: result.rows,
		});
	} catch (error) {
		return next(error);
	}
}

async function moderateReview(req, res, next, actionKey) {
	try {
		const reviewId = Number.parseInt(req.params.id, 10);
		const action = REVIEW_ACTIONS[actionKey];

		if (!Number.isInteger(reviewId) || reviewId <= 0) {
			return res.status(400).render('error', {
				title: 'Invalid Review',
				message: 'That review link is not valid.',
			});
		}

		const reviewResult = await pool.query('SELECT id FROM reviews WHERE id = $1', [reviewId]);

		if (reviewResult.rows.length === 0) {
			return res.status(404).render('error', {
				title: 'Review Not Found',
				message: 'That review could not be found.',
			});
		}

		await pool.query('UPDATE reviews SET status = $1 WHERE id = $2', [action.status, reviewId]);
		await pool.query(
			'INSERT INTO review_moderation_actions (review_id, actor_user_id, action, note) VALUES ($1, $2, $3, $4)',
			[reviewId, req.session.user.id, actionKey, action.note]
		);

		req.session.notice = `Review was ${actionKey === 'flag' ? 'flagged' : 'removed'}.`;
		return res.redirect('/staff/reviews');
	} catch (error) {
		return next(error);
	}
}

export async function flagReview(req, res, next) {
	return moderateReview(req, res, next, 'flag');
}

export async function removeReview(req, res, next) {
	return moderateReview(req, res, next, 'remove');
}

export async function getServiceRequests(req, res, next) {
	try {
		const result = await pool.query(
			`
				SELECT
					sr.id,
					sr.service_type,
					sr.status,
					sr.created_at,
					u.display_name,
					v.id AS vehicle_id,
					v.year,
					v.make,
					v.model
				FROM service_requests sr
				LEFT JOIN users u ON u.id = sr.user_id
				LEFT JOIN vehicles v ON v.id = sr.vehicle_id
				ORDER BY sr.created_at DESC, sr.id DESC
			`
		);

		return res.render('staff/service-requests', {
			title: 'Service Requests',
			serviceRequests: result.rows,
		});
	} catch (error) {
		return next(error);
	}
}

export async function getServiceRequestDetail(req, res, next) {
	try {
		const requestId = Number.parseInt(req.params.id, 10);

		if (!Number.isInteger(requestId) || requestId <= 0) {
			return res.status(400).render('error', {
				title: 'Invalid Request',
				message: 'That service request link is not valid.',
			});
		}

		const data = await loadServiceRequest(requestId);

		if (!data.request) {
			return res.status(404).render('error', {
				title: 'Request Not Found',
				message: 'That service request could not be found.',
			});
		}

		return res.render('staff/service-request-show', {
			title: 'Service Request',
			serviceRequest: data.request,
			history: data.history,
			statusOptions: SERVICE_REQUEST_STATUSES,
			error: null,
			form: {
				status: data.request.status,
				internalNote: data.request.internal_notes,
			},
		});
	} catch (error) {
		return next(error);
	}
}

export async function updateServiceRequest(req, res, next) {
	try {
		const requestId = Number.parseInt(req.params.id, 10);
		const status = normalizeAllowedStatus(req.body.status, SERVICE_REQUEST_STATUSES);
		const internalNote = normalizeText(req.body.internalNote);

		if (!Number.isInteger(requestId) || requestId <= 0) {
			return res.status(400).render('error', {
				title: 'Invalid Request',
				message: 'That service request link is not valid.',
			});
		}

		const data = await loadServiceRequest(requestId);

		if (!data.request) {
			return res.status(404).render('error', {
				title: 'Request Not Found',
				message: 'That service request could not be found.',
			});
		}

		if (!status) {
			return res.status(400).render('staff/service-request-show', {
				title: 'Service Request',
				serviceRequest: data.request,
				history: data.history,
				statusOptions: SERVICE_REQUEST_STATUSES,
				error: 'Choose a valid request status.',
				form: {
					status: req.body.status,
					internalNote,
				},
			});
		}

		const nextInternalNotes = internalNote
			? [data.request.internal_notes, internalNote].filter(Boolean).join('\n\n')
			: data.request.internal_notes;
		const historyNote = internalNote || 'Status updated by staff.';

		await pool.query(
			`
				UPDATE service_requests
				SET status = $1,
					internal_notes = $2
				WHERE id = $3
			`,
			[status, nextInternalNotes, requestId]
		);
		await pool.query(
			`
				INSERT INTO service_request_history (service_request_id, status, note)
				VALUES ($1, $2, $3)
			`,
			[requestId, status, historyNote]
		);

		req.session.notice = 'Service request was updated.';
		return res.redirect(`/staff/service-requests/${requestId}`);
	} catch (error) {
		return next(error);
	}
}

export async function getContactMessages(req, res, next) {
	try {
		const messages = await loadContactMessages();

		return res.render('staff/contact-messages', {
			title: 'Contact Messages',
			contactMessages: messages,
			statusOptions: CONTACT_MESSAGE_STATUSES,
		});
	} catch (error) {
		return next(error);
	}
}

export async function updateContactMessage(req, res, next) {
	try {
		const messageId = Number.parseInt(req.params.id, 10);
		const status = normalizeAllowedStatus(req.body.status, CONTACT_MESSAGE_STATUSES);
		const staffNote = normalizeText(req.body.staffNote);

		if (!Number.isInteger(messageId) || messageId <= 0) {
			return res.status(400).render('error', {
				title: 'Invalid Message',
				message: 'That contact message link is not valid.',
			});
		}

		if (!status) {
			const messages = await loadContactMessages();
			return res.status(400).render('staff/contact-messages', {
				title: 'Contact Messages',
				contactMessages: messages,
				statusOptions: CONTACT_MESSAGE_STATUSES,
				error: 'Choose a valid contact message status.',
			});
		}

		await pool.query(
			`
				UPDATE contact_messages
				SET status = $1,
					staff_note = $2,
					updated_at = NOW()
				WHERE id = $3
			`,
			[status, staffNote, messageId]
		);

		req.session.notice = 'Contact message was updated.';
		return res.redirect('/staff/contact-messages');
	} catch (error) {
		return next(error);
	}
}