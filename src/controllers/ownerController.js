import pool from '../db.js';

const SERVICE_REQUEST_STATUSES = ['Submitted', 'In Progress', 'Waiting on Customer', 'Completed', 'Closed'];
const CONTACT_MESSAGE_STATUSES = ['New', 'Reviewed', 'Closed'];

function normalizeText(value) {
	return String(value ?? '').trim();
}

function normalizeBoolean(value) {
	return ['true', '1', 'on', 'yes'].includes(String(value).toLowerCase());
}

function normalizeInteger(value) {
	const parsedValue = Number.parseInt(String(value ?? '').trim(), 10);
	return Number.isInteger(parsedValue) ? parsedValue : null;
}

function normalizePrice(value) {
	const parsedValue = Number.parseFloat(String(value ?? '').trim());
	return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeAllowedStatus(value, allowedStatuses) {
	const normalized = normalizeText(value);
	return allowedStatuses.find((status) => status.toLowerCase() === normalized.toLowerCase()) || null;
}

function invalidIdResponse(res, title, message) {
	return res.status(400).render('error', { title, message });
}

async function loadRoles() {
	const result = await pool.query('SELECT id, name FROM roles ORDER BY id ASC');
	return result.rows;
}

async function loadOwnerDashboard() {
	const [summaryResult, usersResult, categoriesResult, vehiclesResult, reviewsResult, requestsResult, messagesResult] = await Promise.all([
		pool.query(
			`
				SELECT
					(SELECT COUNT(*) FROM users) AS total_users,
					(SELECT COUNT(*) FROM vehicles) AS total_vehicles,
					(SELECT COUNT(*) FROM categories) AS total_categories,
					(SELECT COUNT(*) FROM vehicle_images) AS total_vehicle_images,
					(SELECT COUNT(*) FROM reviews) AS total_reviews,
					(SELECT COUNT(*) FROM service_requests) AS total_service_requests,
					(SELECT COUNT(*) FROM contact_messages) AS total_contact_messages,
					(SELECT COUNT(*) FROM service_requests WHERE status IN ('Submitted', 'In Progress', 'Waiting on Customer')) AS open_service_requests,
					(SELECT COUNT(*) FROM contact_messages WHERE status = 'New') AS new_contact_messages
				`
			),
		pool.query(
			`
				SELECT u.id, u.display_name, u.email, u.created_at, r.name AS role_name
				FROM users u
				JOIN roles r ON r.id = u.role_id
				ORDER BY u.created_at DESC, u.id DESC
				LIMIT 5
			`
		),
		pool.query(
			`
				SELECT c.id, c.name, COUNT(v.id) AS vehicle_count
				FROM categories c
				LEFT JOIN vehicles v ON v.category_id = c.id
				GROUP BY c.id
				ORDER BY c.name ASC
				LIMIT 5
			`
		),
		pool.query(
			`
				SELECT
					v.id,
					v.year,
					v.make,
					v.model,
					v.price,
					v.is_available,
					c.name AS category_name,
					(
						SELECT image_url
						FROM vehicle_images vi
						WHERE vi.vehicle_id = v.id
						ORDER BY vi.id ASC
						LIMIT 1
					) AS image_url
				FROM vehicles v
				LEFT JOIN categories c ON c.id = v.category_id
				ORDER BY v.created_at DESC, v.id DESC
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
					v.model
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
					u.display_name,
					v.id AS vehicle_id,
					v.year,
					v.make,
					v.model,
					(
						SELECT note
						FROM service_request_history srh
						WHERE srh.service_request_id = sr.id
						ORDER BY srh.created_at DESC, srh.id DESC
						LIMIT 1
					) AS latest_note
				FROM service_requests sr
				LEFT JOIN users u ON u.id = sr.user_id
				LEFT JOIN vehicles v ON v.id = sr.vehicle_id
				ORDER BY sr.created_at DESC, sr.id DESC
				LIMIT 5
			`
		),
		pool.query(
			`
				SELECT id, name, email, status, message, staff_note, created_at
				FROM contact_messages
				ORDER BY created_at DESC, id DESC
				LIMIT 5
			`
		),
	]);

	return {
		summary: summaryResult.rows[0] || {
			total_users: 0,
			total_vehicles: 0,
			total_categories: 0,
			total_vehicle_images: 0,
			total_reviews: 0,
			total_service_requests: 0,
			total_contact_messages: 0,
			open_service_requests: 0,
			new_contact_messages: 0,
		},
		recentUsers: usersResult.rows,
		recentCategories: categoriesResult.rows,
		recentVehicles: vehiclesResult.rows,
		recentReviews: reviewsResult.rows,
		recentRequests: requestsResult.rows,
		recentMessages: messagesResult.rows,
	};
}

async function loadVehicle(vehicleId) {
	const [vehicleResult, categoriesResult, imagesResult] = await Promise.all([
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
		pool.query(
			`
				SELECT id, image_url, alt_text
				FROM vehicle_images
				WHERE vehicle_id = $1
				ORDER BY id ASC
			`,
			[vehicleId]
		),
	]);

	return {
		vehicle: vehicleResult.rows[0] || null,
		categories: categoriesResult.rows,
		images: imagesResult.rows,
	};
}

async function loadUsersView() {
	const [usersResult, rolesResult] = await Promise.all([
		pool.query(
			`
				SELECT u.id, u.display_name, u.email, u.created_at, r.id AS role_id, r.name AS role_name
				FROM users u
				JOIN roles r ON r.id = u.role_id
				ORDER BY u.created_at DESC, u.id DESC
			`
		),
		loadRoles(),
	]);

	return { users: usersResult.rows, roles: rolesResult };
}

async function loadCategoriesView() {
	const result = await pool.query(
		`
			SELECT c.id, c.name, COUNT(v.id) AS vehicle_count
			FROM categories c
			LEFT JOIN vehicles v ON v.category_id = c.id
			GROUP BY c.id
			ORDER BY c.name ASC
		`
	);

	return result.rows;
}

async function loadInventoryView() {
	const [vehiclesResult, categoriesResult] = await Promise.all([
		pool.query(
			`
				SELECT
					v.id,
					v.year,
					v.make,
					v.model,
					v.mileage,
					v.price,
					v.description,
					v.is_available,
					v.created_at,
					c.name AS category_name,
					(
						SELECT image_url
						FROM vehicle_images vi
						WHERE vi.vehicle_id = v.id
						ORDER BY vi.id ASC
						LIMIT 1
					) AS image_url,
					(
						SELECT COUNT(*)
						FROM vehicle_images vi
						WHERE vi.vehicle_id = v.id
					) AS image_count
				FROM vehicles v
				LEFT JOIN categories c ON c.id = v.category_id
				ORDER BY v.created_at DESC, v.id DESC
			`
		),
		pool.query('SELECT id, name FROM categories ORDER BY name ASC'),
	]);

	return { vehicles: vehiclesResult.rows, categories: categoriesResult.rows };
}

async function loadReviewsView() {
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

	return result.rows;
}

async function loadServiceRequestsView() {
	const result = await pool.query(
		`
			SELECT
				sr.id,
				sr.service_type,
				sr.notes,
				sr.internal_notes,
				sr.status,
				sr.created_at,
				u.display_name,
				v.id AS vehicle_id,
				v.year,
				v.make,
				v.model,
				(
					SELECT COUNT(*)
					FROM service_request_history srh
					WHERE srh.service_request_id = sr.id
				) AS history_count
			FROM service_requests sr
			LEFT JOIN users u ON u.id = sr.user_id
			LEFT JOIN vehicles v ON v.id = sr.vehicle_id
			ORDER BY sr.created_at DESC, sr.id DESC
		`
	);

	return result.rows;
}

async function loadContactMessagesView() {
	const result = await pool.query(
		`
			SELECT id, name, email, message, status, staff_note, updated_at, created_at
			FROM contact_messages
			ORDER BY created_at DESC, id DESC
		`
	);

	return result.rows;
}

export async function getOwnerDashboard(req, res, next) {
	try {
		const data = await loadOwnerDashboard();

		return res.render('owner/dashboard', {
			title: 'Owner Dashboard',
			...data,
		});
	} catch (error) {
		return next(error);
	}
}

export async function getUsers(req, res, next) {
	try {
		const data = await loadUsersView();

		return res.render('owner/users', {
			title: 'User Management',
			users: data.users,
			roles: data.roles,
		});
	} catch (error) {
		return next(error);
	}
}

export async function updateUserRole(req, res, next) {
	try {
		const userId = normalizeInteger(req.params.id);
		const roleId = normalizeInteger(req.body.roleId);

		if (!userId) {
			return invalidIdResponse(res, 'Invalid User', 'That user link is not valid.');
		}

		if (!roleId) {
			return res.status(400).render('error', {
				title: 'Invalid Role',
				message: 'Choose a valid role.',
			});
		}

		const [targetUserResult, roleResult] = await Promise.all([
			pool.query(
				`
					SELECT u.id, u.display_name, u.email, u.role_id, r.name AS role_name
					FROM users u
					JOIN roles r ON r.id = u.role_id
					WHERE u.id = $1
				`,
				[userId]
			),
			pool.query('SELECT id, name FROM roles WHERE id = $1', [roleId]),
		]);

		const targetUser = targetUserResult.rows[0] || null;
		const nextRole = roleResult.rows[0] || null;

		if (!targetUser) {
			return res.status(404).render('error', {
				title: 'User Not Found',
				message: 'That user could not be found.',
			});
		}

		if (!nextRole) {
			return res.status(400).render('error', {
				title: 'Invalid Role',
				message: 'Choose a valid role.',
			});
		}

		if (targetUser.id === req.session.user.id && nextRole.name !== 'owner') {
			return res.status(400).render('error', {
				title: 'Role Change Blocked',
				message: 'You cannot remove your own owner access from this page.',
			});
		}

		if (targetUser.role_id === nextRole.id) {
			req.session.notice = 'That user already has this role.';
			return res.redirect('/owner/users');
		}

		await pool.query('UPDATE users SET role_id = $1 WHERE id = $2', [nextRole.id, userId]);
		req.session.notice = `Updated ${targetUser.display_name}'s role to ${nextRole.name}.`;
		return res.redirect('/owner/users');
	} catch (error) {
		return next(error);
	}
}

export async function getCategories(req, res, next) {
	try {
		const categories = await loadCategoriesView();

		return res.render('owner/categories', {
			title: 'Category Management',
			categories,
			error: null,
			form: { name: '' },
		});
	} catch (error) {
		return next(error);
	}
}

export async function createCategory(req, res, next) {
	try {
		const name = normalizeText(req.body.name);

		if (!name) {
			const categories = await loadCategoriesView();
			return res.status(400).render('owner/categories', {
				title: 'Category Management',
				categories,
				error: 'Enter a category name.',
				form: { name },
			});
		}

		const existingCategory = await pool.query('SELECT id FROM categories WHERE lower(name) = lower($1)', [name]);
		if (existingCategory.rows.length > 0) {
			const categories = await loadCategoriesView();
			return res.status(400).render('owner/categories', {
				title: 'Category Management',
				categories,
				error: 'That category already exists.',
				form: { name },
			});
		}

		await pool.query('INSERT INTO categories (name) VALUES ($1)', [name]);
		req.session.notice = 'Category was created.';
		return res.redirect('/owner/categories');
	} catch (error) {
		return next(error);
	}
}

export async function updateCategory(req, res, next) {
	try {
		const categoryId = normalizeInteger(req.params.id);
		const name = normalizeText(req.body.name);

		if (!categoryId) {
			return invalidIdResponse(res, 'Invalid Category', 'That category link is not valid.');
		}

		const categoryResult = await pool.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
		if (categoryResult.rows.length === 0) {
			return res.status(404).render('error', {
				title: 'Category Not Found',
				message: 'That category could not be found.',
			});
		}

		if (!name) {
			const categories = await loadCategoriesView();
			return res.status(400).render('owner/categories', {
				title: 'Category Management',
				categories,
				error: 'Enter a category name.',
				form: { name },
			});
		}

		const duplicateResult = await pool.query('SELECT id FROM categories WHERE lower(name) = lower($1) AND id <> $2', [name, categoryId]);
		if (duplicateResult.rows.length > 0) {
			const categories = await loadCategoriesView();
			return res.status(400).render('owner/categories', {
				title: 'Category Management',
				categories,
				error: 'That category already exists.',
				form: { name },
			});
		}

		await pool.query('UPDATE categories SET name = $1 WHERE id = $2', [name, categoryId]);
		req.session.notice = 'Category was updated.';
		return res.redirect('/owner/categories');
	} catch (error) {
		return next(error);
	}
}

export async function deleteCategory(req, res, next) {
	try {
		const categoryId = normalizeInteger(req.params.id);

		if (!categoryId) {
			return invalidIdResponse(res, 'Invalid Category', 'That category link is not valid.');
		}

		const categoryResult = await pool.query('SELECT id, name FROM categories WHERE id = $1', [categoryId]);
		if (categoryResult.rows.length === 0) {
			return res.status(404).render('error', {
				title: 'Category Not Found',
				message: 'That category could not be found.',
			});
		}

		const usageResult = await pool.query('SELECT COUNT(*)::int AS vehicle_count FROM vehicles WHERE category_id = $1', [categoryId]);
		await pool.query('DELETE FROM categories WHERE id = $1', [categoryId]);
		req.session.notice = `Category was deleted and ${usageResult.rows[0]?.vehicle_count || 0} vehicle(s) were unassigned.`;
		return res.redirect('/owner/categories');
	} catch (error) {
		return next(error);
	}
}

export async function getVehicles(req, res, next) {
	try {
		const data = await loadInventoryView();

		return res.render('owner/vehicles', {
			title: 'Vehicle Inventory',
			vehicles: data.vehicles,
			categories: data.categories,
		});
	} catch (error) {
		return next(error);
	}
}

export async function getVehicleNew(req, res, next) {
	try {
		const categories = await pool.query('SELECT id, name FROM categories ORDER BY name ASC');

		return res.render('owner/vehicle-form', {
			title: 'Add Vehicle',
			mode: 'create',
			vehicle: null,
			categories: categories.rows,
			images: [],
			error: null,
			form: {
				year: '',
				make: '',
				model: '',
				mileage: '0',
				price: '',
				description: '',
				categoryId: '',
				isAvailable: true,
				imageUrl: '',
				imageAltText: '',
			},
		});
	} catch (error) {
		return next(error);
	}
}

export async function getVehicleEdit(req, res, next) {
	try {
		const vehicleId = normalizeInteger(req.params.id);

		if (!vehicleId) {
			return invalidIdResponse(res, 'Invalid Vehicle', 'That vehicle link is not valid.');
		}

		const data = await loadVehicle(vehicleId);
		if (!data.vehicle) {
			return res.status(404).render('error', {
				title: 'Vehicle Not Found',
				message: 'That vehicle could not be found.',
			});
		}

		return res.render('owner/vehicle-form', {
			title: 'Edit Vehicle',
			mode: 'edit',
			vehicle: data.vehicle,
			categories: data.categories,
			images: data.images,
			error: null,
			form: {
				year: data.vehicle.year,
				make: data.vehicle.make,
				model: data.vehicle.model,
				mileage: data.vehicle.mileage,
				price: data.vehicle.price,
				description: data.vehicle.description,
				categoryId: data.vehicle.category_id || '',
				isAvailable: data.vehicle.is_available,
				imageUrl: '',
				imageAltText: '',
			},
		});
	} catch (error) {
		return next(error);
	}
}

export async function createVehicle(req, res, next) {
	try {
		const year = normalizeInteger(req.body.year);
		const mileage = normalizeInteger(req.body.mileage);
		const price = normalizePrice(req.body.price);
		const make = normalizeText(req.body.make);
		const model = normalizeText(req.body.model);
		const description = normalizeText(req.body.description);
		const categoryId = normalizeInteger(req.body.categoryId);
		const isAvailable = normalizeBoolean(req.body.isAvailable);
		const imageUrl = normalizeText(req.body.imageUrl);
		const imageAltText = normalizeText(req.body.imageAltText);

		if (!year || year < 1886 || year > 2100 || mileage === null || mileage < 0 || price === null || price < 0 || !make || !model) {
			const categories = await pool.query('SELECT id, name FROM categories ORDER BY name ASC');
			return res.status(400).render('owner/vehicle-form', {
				title: 'Add Vehicle',
				mode: 'create',
				vehicle: null,
				categories: categories.rows,
				images: [],
				error: 'Enter a valid year, make, model, mileage, and price.',
				form: {
					year: req.body.year,
					make,
					model,
					mileage: req.body.mileage,
					price: req.body.price,
					description,
					categoryId: req.body.categoryId || '',
					isAvailable,
					imageUrl,
					imageAltText,
				},
			});
		}

		let nextCategoryId = null;
		if (categoryId) {
			const categoryResult = await pool.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
			if (categoryResult.rows.length === 0) {
				const categories = await pool.query('SELECT id, name FROM categories ORDER BY name ASC');
				return res.status(400).render('owner/vehicle-form', {
					title: 'Add Vehicle',
					mode: 'create',
					vehicle: null,
					categories: categories.rows,
					images: [],
					error: 'Choose a valid category.',
					form: {
						year,
						make,
						model,
						mileage,
						price,
						description,
						categoryId: req.body.categoryId,
						isAvailable,
						imageUrl,
						imageAltText,
					},
				});
			}
			nextCategoryId = categoryId;
		}

		const vehicleResult = await pool.query(
			`
				INSERT INTO vehicles (category_id, year, make, model, mileage, price, description, is_available)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				RETURNING id
			`,
			[nextCategoryId, year, make, model, mileage, price, description, isAvailable]
		);
		const vehicleId = vehicleResult.rows[0].id;

		if (imageUrl) {
			await pool.query('INSERT INTO vehicle_images (vehicle_id, image_url, alt_text) VALUES ($1, $2, $3)', [vehicleId, imageUrl, imageAltText || `${year} ${make} ${model}`]);
		}

		req.session.notice = 'Vehicle was created.';
		return res.redirect(`/owner/vehicles/${vehicleId}/edit`);
	} catch (error) {
		return next(error);
	}
}

export async function updateVehicle(req, res, next) {
	try {
		const vehicleId = normalizeInteger(req.params.id);
		const year = normalizeInteger(req.body.year);
		const mileage = normalizeInteger(req.body.mileage);
		const price = normalizePrice(req.body.price);
		const make = normalizeText(req.body.make);
		const model = normalizeText(req.body.model);
		const description = normalizeText(req.body.description);
		const categoryId = normalizeInteger(req.body.categoryId);
		const isAvailable = normalizeBoolean(req.body.isAvailable);

		if (!vehicleId) {
			return invalidIdResponse(res, 'Invalid Vehicle', 'That vehicle link is not valid.');
		}

		const data = await loadVehicle(vehicleId);
		if (!data.vehicle) {
			return res.status(404).render('error', {
				title: 'Vehicle Not Found',
				message: 'That vehicle could not be found.',
			});
		}

		if (!year || year < 1886 || year > 2100 || mileage === null || mileage < 0 || price === null || price < 0 || !make || !model) {
			return res.status(400).render('owner/vehicle-form', {
				title: 'Edit Vehicle',
				mode: 'edit',
				vehicle: data.vehicle,
				categories: data.categories,
				images: data.images,
				error: 'Enter a valid year, make, model, mileage, and price.',
				form: {
					year: req.body.year,
					make,
					model,
					mileage: req.body.mileage,
					price: req.body.price,
					description,
					categoryId: req.body.categoryId || '',
					isAvailable,
					imageUrl: '',
					imageAltText: '',
				},
			});
		}

		let nextCategoryId = null;
		if (categoryId) {
			const categoryResult = await pool.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
			if (categoryResult.rows.length === 0) {
				return res.status(400).render('owner/vehicle-form', {
					title: 'Edit Vehicle',
					mode: 'edit',
					vehicle: data.vehicle,
					categories: data.categories,
					images: data.images,
					error: 'Choose a valid category.',
					form: {
						year,
						make,
						model,
						mileage,
						price,
						description,
						categoryId: req.body.categoryId,
						isAvailable,
						imageUrl: '',
						imageAltText: '',
					},
				});
			}
			nextCategoryId = categoryId;
		}

		await pool.query(
			`
				UPDATE vehicles
				SET category_id = $1,
					year = $2,
					make = $3,
					model = $4,
					mileage = $5,
					price = $6,
					description = $7,
					is_available = $8
				WHERE id = $9
			`,
			[nextCategoryId, year, make, model, mileage, price, description, isAvailable, vehicleId]
		);

		req.session.notice = 'Vehicle was updated.';
		return res.redirect(`/owner/vehicles/${vehicleId}/edit`);
	} catch (error) {
		return next(error);
	}
}

export async function deleteVehicle(req, res, next) {
	try {
		const vehicleId = normalizeInteger(req.params.id);

		if (!vehicleId) {
			return invalidIdResponse(res, 'Invalid Vehicle', 'That vehicle link is not valid.');
		}

		const result = await pool.query('SELECT id FROM vehicles WHERE id = $1', [vehicleId]);
		if (result.rows.length === 0) {
			return res.status(404).render('error', {
				title: 'Vehicle Not Found',
				message: 'That vehicle could not be found.',
			});
		}

		await pool.query('DELETE FROM vehicles WHERE id = $1', [vehicleId]);
		req.session.notice = 'Vehicle was deleted.';
		return res.redirect('/owner/vehicles');
	} catch (error) {
		return next(error);
	}
}

export async function addVehicleImage(req, res, next) {
	try {
		const vehicleId = normalizeInteger(req.params.id);
		const imageUrl = normalizeText(req.body.imageUrl);
		const altText = normalizeText(req.body.altText);

		if (!vehicleId) {
			return invalidIdResponse(res, 'Invalid Vehicle', 'That vehicle link is not valid.');
		}

		const vehicleResult = await pool.query('SELECT id, year, make, model FROM vehicles WHERE id = $1', [vehicleId]);
		if (vehicleResult.rows.length === 0) {
			return res.status(404).render('error', {
				title: 'Vehicle Not Found',
				message: 'That vehicle could not be found.',
			});
		}

		if (!imageUrl) {
			const data = await loadVehicle(vehicleId);
			return res.status(400).render('owner/vehicle-form', {
				title: 'Edit Vehicle',
				mode: 'edit',
				vehicle: data.vehicle,
				categories: data.categories,
				images: data.images,
				error: 'Enter an image URL.',
				form: {
					year: data.vehicle.year,
					make: data.vehicle.make,
					model: data.vehicle.model,
					mileage: data.vehicle.mileage,
					price: data.vehicle.price,
					description: data.vehicle.description,
					categoryId: data.vehicle.category_id || '',
					isAvailable: data.vehicle.is_available,
					imageUrl,
					imageAltText: altText,
				},
			});
		}

		await pool.query('INSERT INTO vehicle_images (vehicle_id, image_url, alt_text) VALUES ($1, $2, $3)', [vehicleId, imageUrl, altText || `${vehicleResult.rows[0].year} ${vehicleResult.rows[0].make} ${vehicleResult.rows[0].model}`]);
		req.session.notice = 'Vehicle image was added.';
		return res.redirect(`/owner/vehicles/${vehicleId}/edit`);
	} catch (error) {
		return next(error);
	}
}

export async function deleteVehicleImage(req, res, next) {
	try {
		const imageId = normalizeInteger(req.params.id);

		if (!imageId) {
			return invalidIdResponse(res, 'Invalid Image', 'That image link is not valid.');
		}

		const imageResult = await pool.query('SELECT vehicle_id FROM vehicle_images WHERE id = $1', [imageId]);
		if (imageResult.rows.length === 0) {
			return res.status(404).render('error', {
				title: 'Image Not Found',
				message: 'That vehicle image could not be found.',
			});
		}

		await pool.query('DELETE FROM vehicle_images WHERE id = $1', [imageId]);
		req.session.notice = 'Vehicle image was deleted.';
		return res.redirect(`/owner/vehicles/${imageResult.rows[0].vehicle_id}/edit`);
	} catch (error) {
		return next(error);
	}
}

export async function getReviews(req, res, next) {
	try {
		const reviews = await loadReviewsView();

		return res.render('owner/reviews', {
			title: 'All Reviews',
			reviews,
		});
	} catch (error) {
		return next(error);
	}
}

export async function getServiceRequests(req, res, next) {
	try {
		const serviceRequests = await loadServiceRequestsView();

		return res.render('owner/service-requests', {
			title: 'All Service Requests',
			serviceRequests,
			historyOptions: SERVICE_REQUEST_STATUSES,
		});
	} catch (error) {
		return next(error);
	}
}

export async function getContactMessages(req, res, next) {
	try {
		const contactMessages = await loadContactMessagesView();

		return res.render('owner/contact-messages', {
			title: 'Contact Messages',
			contactMessages,
			statusOptions: CONTACT_MESSAGE_STATUSES,
		});
	} catch (error) {
		return next(error);
	}
}