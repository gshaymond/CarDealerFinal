import pool from '../db.js';

const INVENTORY_SORTS = {
	newest: 'v.created_at DESC, v.id DESC',
	oldest: 'v.created_at ASC, v.id ASC',
	price_asc: 'v.price ASC, v.id DESC',
	price_desc: 'v.price DESC, v.id DESC',
	mileage_asc: 'v.mileage ASC, v.id DESC',
	mileage_desc: 'v.mileage DESC, v.id DESC',
	year_desc: 'v.year DESC, v.id DESC',
	year_asc: 'v.year ASC, v.id DESC',
};

function resolveInventorySort(sort) {
	if (typeof sort !== 'string') {
		return 'newest';
	}

	return Object.hasOwn(INVENTORY_SORTS, sort) ? sort : 'newest';
}

function normalizeTextFilter(value) {
	if (typeof value !== 'string') {
		return '';
	}

	return value.trim();
}

function parseIntegerFilter(value) {
	if (typeof value !== 'string') {
		return null;
	}

	const parsedValue = Number.parseInt(value.trim(), 10);
	return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseDecimalFilter(value) {
	if (typeof value !== 'string') {
		return null;
	}

	const parsedValue = Number.parseFloat(value.trim());
	return Number.isFinite(parsedValue) ? parsedValue : null;
}

function resolveInventoryFilters(query = {}) {
	const year = parseIntegerFilter(query.year);
	const make = normalizeTextFilter(query.make);
	const model = normalizeTextFilter(query.model);
	const priceMax = parseDecimalFilter(query.priceMax);
	const mileageMax = parseIntegerFilter(query.mileageMax);

	const filters = {
		year,
		make,
		model,
		priceMax,
		mileageMax,
	};

	const filterForm = {
		year: year === null ? '' : String(year),
		make,
		model,
		priceMax: priceMax === null ? '' : String(priceMax),
		mileageMax: mileageMax === null ? '' : String(mileageMax),
	};

	const hasActiveFilters = Object.values(filters).some((value) => {
		if (typeof value === 'string') {
			return value.length > 0;
		}

		return value !== null;
	});

	return {
		filters,
		filterForm,
		hasActiveFilters,
	};
}

async function fetchInventoryFilterOptions() {
	const [yearsResult, makesResult, modelsResult, pricesResult, mileagesResult] = await Promise.all([
		pool.query(
			`
				SELECT DISTINCT v.year
				FROM vehicles v
				WHERE v.year IS NOT NULL
				ORDER BY v.year DESC
			`
		),
		pool.query(
			`
				SELECT DISTINCT v.make
				FROM vehicles v
				WHERE v.make IS NOT NULL
					AND TRIM(v.make) <> ''
				ORDER BY v.make ASC
			`
		),
		pool.query(
			`
				SELECT DISTINCT v.model
				FROM vehicles v
				WHERE v.model IS NOT NULL
					AND TRIM(v.model) <> ''
				ORDER BY v.model ASC
			`
		),
		pool.query(
			`
				SELECT DISTINCT v.price
				FROM vehicles v
				WHERE v.price IS NOT NULL
				ORDER BY v.price ASC
			`
		),
		pool.query(
			`
				SELECT DISTINCT v.mileage
				FROM vehicles v
				WHERE v.mileage IS NOT NULL
				ORDER BY v.mileage ASC
			`
		),
	]);

	return {
		years: yearsResult.rows.map((row) => row.year),
		makes: makesResult.rows.map((row) => row.make),
		models: modelsResult.rows.map((row) => row.model),
		priceMaxValues: pricesResult.rows.map((row) => row.price),
		mileageMaxValues: mileagesResult.rows.map((row) => row.mileage),
	};
}

export async function fetchInventoryVehicles(sort = 'newest', filters = {}) {
	const safeSort = resolveInventorySort(sort);
	const orderBy = INVENTORY_SORTS[safeSort];
	const whereClauses = [];
	const params = [];

	if (filters.year !== null) {
		params.push(filters.year);
		whereClauses.push(`v.year = $${params.length}`);
	}

	if (filters.make) {
		params.push(filters.make);
		whereClauses.push(`v.make = $${params.length}`);
	}

	if (filters.model) {
		params.push(filters.model);
		whereClauses.push(`v.model = $${params.length}`);
	}

	if (filters.priceMax !== null) {
		params.push(filters.priceMax);
		whereClauses.push(`v.price <= $${params.length}`);
	}

	if (filters.mileageMax !== null) {
		params.push(filters.mileageMax);
		whereClauses.push(`v.mileage <= $${params.length}`);
	}

	const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

	const result = await pool.query(`
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
				SELECT vi.image_url
				FROM vehicle_images vi
				WHERE vi.vehicle_id = v.id
				ORDER BY vi.id
				LIMIT 1
			) AS image_url
		FROM vehicles v
		LEFT JOIN categories c ON c.id = v.category_id
		${whereSql}
		ORDER BY ${orderBy}
	`, params);

	return result.rows;
}

async function fetchVehicleDetails(vehicleId, userId = null) {
	const vehicleResult = await pool.query(
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
				c.name AS category_name
			FROM vehicles v
			LEFT JOIN categories c ON c.id = v.category_id
			WHERE v.id = $1
		`,
		[vehicleId]
	);

	const vehicle = vehicleResult.rows[0] || null;

	if (!vehicle) {
		return null;
	}

	const [imageResult, reviewResult] = await Promise.all([
		pool.query(
			`
				SELECT id, image_url, alt_text
				FROM vehicle_images
				WHERE vehicle_id = $1
				ORDER BY id ASC
			`,
			[vehicleId]
		),
		pool.query(
			`
				SELECT
					r.id,
					r.user_id,
					r.rating,
					r.comment,
					r.status,
					r.created_at,
					u.display_name
				FROM reviews r
				LEFT JOIN users u ON u.id = r.user_id
				WHERE r.vehicle_id = $1
					AND r.status IN ('Pending', 'Approved')
				ORDER BY r.created_at DESC, r.id DESC
			`,
			[vehicleId]
		),
	]);

	const reviews = reviewResult.rows;
	const currentUserReview = userId ? reviews.find((review) => review.user_id === userId) || null : null;

	return {
		vehicle,
		images: imageResult.rows,
		reviews,
		currentUserReview,
	};
}

export async function getInventory(req, res, next) {
	try {
		const selectedSort = resolveInventorySort(req.query.sort);
		const { filters, filterForm, hasActiveFilters } = resolveInventoryFilters(req.query || {});
		const [vehicles, filterOptions] = await Promise.all([
			fetchInventoryVehicles(selectedSort, filters),
			fetchInventoryFilterOptions(),
		]);

		return res.render('vehicles/index', {
			title: 'Inventory',
			vehicles,
			selectedSort,
			filterForm,
			filterOptions,
			hasActiveFilters,
		});
	} catch (error) {
		return next(error);
	}
}

export async function getVehicle(req, res, next) {
	try {
		const vehicleId = Number.parseInt(req.params.id, 10);
		const userId = req.session?.user?.id || null;

		if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
			return res.status(400).render('vehicles/show', {
				title: 'Vehicle Details',
				vehicle: null,
				images: [],
				reviews: [],
				currentUserReview: null,
				serviceTypes: ['Oil Change', 'Inspection', 'Maintenance', 'Repair', 'Detail', 'Other'],
				reviewError: null,
				serviceRequestError: null,
				reviewForm: {},
				serviceRequestForm: {},
				found: false,
				message: 'That vehicle link is not valid.',
			});
		}

		const vehicleData = await fetchVehicleDetails(vehicleId, userId);
		const vehicle = vehicleData?.vehicle || null;

		if (!vehicle) {
			return res.status(404).render('vehicles/show', {
				title: 'Vehicle Details',
				vehicle: null,
				images: [],
				reviews: [],
				currentUserReview: null,
				serviceTypes: ['Oil Change', 'Inspection', 'Maintenance', 'Repair', 'Detail', 'Other'],
				reviewError: null,
				serviceRequestError: null,
				reviewForm: {},
				serviceRequestForm: {},
				found: false,
				message: 'No vehicle was found for that listing yet.',
			});
		}

		return res.render('vehicles/show', {
			title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
			vehicle: vehicleData.vehicle,
			images: vehicleData.images,
			reviews: vehicleData.reviews,
			currentUserReview: vehicleData.currentUserReview,
			serviceTypes: ['Oil Change', 'Inspection', 'Maintenance', 'Repair', 'Detail', 'Other'],
			reviewError: null,
			serviceRequestError: null,
			reviewForm: {},
			serviceRequestForm: {},
			found: true,
			message: null,
		});
	} catch (error) {
		return next(error);
	}
}