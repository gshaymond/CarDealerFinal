import pool from '../db.js';

async function fetchInventoryVehicles() {
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
		ORDER BY v.created_at DESC, v.id DESC
	`);

	return result.rows;
}

export async function getInventory(req, res, next) {
	try {
		const vehicles = await fetchInventoryVehicles();

		return res.render('vehicles/index', {
			title: 'Inventory',
			vehicles,
		});
	} catch (error) {
		return next(error);
	}
}

export async function getVehicle(req, res, next) {
	try {
		const vehicleId = Number.parseInt(req.params.id, 10);

		if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
			return res.status(400).render('vehicles/show', {
				title: 'Vehicle Details',
				vehicle: null,
				images: [],
				found: false,
				message: 'That vehicle link is not valid.',
			});
		}

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
			return res.status(404).render('vehicles/show', {
				title: 'Vehicle Details',
				vehicle: null,
				images: [],
				found: false,
				message: 'No vehicle was found for that listing yet.',
			});
		}

		const imageResult = await pool.query(
			`
				SELECT id, image_url, alt_text
				FROM vehicle_images
				WHERE vehicle_id = $1
				ORDER BY id ASC
			`,
			[vehicleId]
		);

		return res.render('vehicles/show', {
			title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
			vehicle,
			images: imageResult.rows,
			found: true,
			message: null,
		});
	} catch (error) {
		return next(error);
	}
}