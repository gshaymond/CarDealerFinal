import pool from '../db.js';
import { fetchInventoryVehicles } from './vehicleController.js';

const SERVICE_TYPES = ['Oil Change', 'Inspection', 'Maintenance', 'Repair', 'Detail', 'Other'];

function normalizeText(value) {
  return (value || '').trim();
}

function normalizeServiceType(value) {
  const trimmed = normalizeText(value);

  return SERVICE_TYPES.find((serviceType) => serviceType.toLowerCase() === trimmed.toLowerCase()) || null;
}

async function loadVehiclePage(vehicleId, userId = null) {
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

function renderVehicleView(res, viewModel) {
  return res.render('vehicles/show', {
    title: viewModel.vehicle ? `${viewModel.vehicle.year} ${viewModel.vehicle.make} ${viewModel.vehicle.model}` : 'Vehicle Details',
    found: Boolean(viewModel.vehicle),
    vehicle: viewModel.vehicle,
    images: viewModel.images || [],
    reviews: viewModel.reviews || [],
    currentUserReview: viewModel.currentUserReview || null,
    serviceTypes: SERVICE_TYPES,
    reviewError: viewModel.reviewError || null,
    serviceRequestError: viewModel.serviceRequestError || null,
    reviewForm: viewModel.reviewForm || {},
    serviceRequestForm: viewModel.serviceRequestForm || {},
    message: viewModel.message || null,
  });
}

async function loadDashboardData(userId) {
  const [serviceRequestsResult, serviceHistoryResult, reviewsResult, vehicles] = await Promise.all([
    pool.query(
      `
        SELECT
          sr.id,
          sr.service_type,
          sr.notes,
          sr.status,
          sr.created_at,
          v.id AS vehicle_id,
          v.year,
          v.make,
          v.model
        FROM service_requests sr
        LEFT JOIN vehicles v ON v.id = sr.vehicle_id
        WHERE sr.user_id = $1
        ORDER BY sr.created_at DESC, sr.id DESC
      `,
      [userId]
    ),
    pool.query(
      `
        SELECT
          service_request_id,
          status,
          note,
          created_at
        FROM service_request_history
        WHERE service_request_id IN (
          SELECT id
          FROM service_requests
          WHERE user_id = $1
        )
        ORDER BY created_at ASC, id ASC
      `,
      [userId]
    ),
    pool.query(
      `
        SELECT
          r.id,
          r.vehicle_id,
          r.rating,
          r.comment,
          r.status,
          r.created_at,
          v.year,
          v.make,
          v.model
        FROM reviews r
        LEFT JOIN vehicles v ON v.id = r.vehicle_id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC, r.id DESC
      `,
      [userId]
    ),
    fetchInventoryVehicles(),
  ]);

  const historyByRequestId = new Map();

  for (const historyEntry of serviceHistoryResult.rows) {
    if (!historyByRequestId.has(historyEntry.service_request_id)) {
      historyByRequestId.set(historyEntry.service_request_id, []);
    }

    historyByRequestId.get(historyEntry.service_request_id).push(historyEntry);
  }

  return {
    serviceRequests: serviceRequestsResult.rows.map((serviceRequest) => ({
      ...serviceRequest,
      history: historyByRequestId.get(serviceRequest.id) || [],
    })),
    reviews: reviewsResult.rows,
    vehicles,
  };
}

function renderDashboardView(res, viewModel) {
  return res.render('dashboard', {
    title: 'My Account',
    serviceRequests: viewModel.serviceRequests || [],
    reviews: viewModel.reviews || [],
    vehicles: viewModel.vehicles || [],
    serviceTypes: SERVICE_TYPES,
    serviceRequestError: viewModel.serviceRequestError || null,
    serviceRequestForm: viewModel.serviceRequestForm || {},
  });
}

export async function getDashboard(req, res, next) {
  try {
    const userId = req.session.user.id;
    const data = await loadDashboardData(userId);

    return renderDashboardView(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function createReview(req, res, next) {
  try {
    const userId = req.session.user.id;
    const vehicleId = Number.parseInt(req.params.id, 10);
    const rating = Number.parseInt(req.body.rating, 10);
    const comment = normalizeText(req.body.comment);

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return res.status(400).render('error', {
        title: 'Invalid Review',
        message: 'That vehicle link is not valid.',
      });
    }

    const vehicle = await loadVehiclePage(vehicleId, userId);

    if (!vehicle) {
      return res.status(404).render('error', {
        title: 'Vehicle Not Found',
        message: 'No vehicle was found for that listing yet.',
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return renderVehicleView(res.status(400), {
        ...vehicle,
        reviewError: 'Choose a rating between 1 and 5.',
        reviewForm: { rating, comment },
      });
    }

    if (!comment) {
      return renderVehicleView(res.status(400), {
        ...vehicle,
        reviewError: 'Add a short comment with your rating.',
        reviewForm: { rating, comment },
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existingReviewResult = await client.query(
        `
          SELECT id
          FROM reviews
          WHERE user_id = $1 AND vehicle_id = $2
          LIMIT 1
        `,
        [userId, vehicleId]
      );

      if (existingReviewResult.rows.length > 0) {
        await client.query(
          `
            UPDATE reviews
            SET rating = $3,
                comment = $4,
                status = 'Pending',
                created_at = NOW()
            WHERE id = $1
          `,
          [existingReviewResult.rows[0].id, userId, rating, comment]
        );
      } else {
        await client.query(
          `
            INSERT INTO reviews (user_id, vehicle_id, rating, comment, status)
            VALUES ($1, $2, $3, $4, 'Pending')
          `,
          [userId, vehicleId, rating, comment]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    req.session.notice = 'Your review was saved and is waiting for moderation.';
    return res.redirect(`/vehicles/${vehicleId}`);
  } catch (error) {
    return next(error);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const userId = req.session.user.id;
    const reviewId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).render('error', {
        title: 'Invalid Review',
        message: 'That review link is not valid.',
      });
    }

    const reviewResult = await pool.query(
      `
        SELECT id, user_id, vehicle_id
        FROM reviews
        WHERE id = $1
      `,
      [reviewId]
    );

    const review = reviewResult.rows[0];

    if (!review) {
      return res.status(404).render('error', {
        title: 'Review Not Found',
        message: 'That review could not be found.',
      });
    }

    if (review.user_id !== userId) {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You can only delete your own reviews.',
      });
    }

    await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    req.session.notice = 'Your review was deleted.';
    return res.redirect(`/vehicles/${review.vehicle_id}`);
  } catch (error) {
    return next(error);
  }
}

export async function createServiceRequest(req, res, next) {
  try {
    const userId = req.session.user.id;
    const isDashboardSubmission = req.path.includes('/dashboard');
    const vehicleId = Number.parseInt(req.body.vehicleId || req.params.id, 10);
    const serviceType = normalizeServiceType(req.body.serviceType);
    const notes = normalizeText(req.body.notes);
    const dashboardData = isDashboardSubmission ? await loadDashboardData(userId) : null;

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      if (isDashboardSubmission) {
        return renderDashboardView(res.status(400), {
          ...dashboardData,
          serviceRequestError: 'Choose a vehicle from the dashboard form.',
          serviceRequestForm: { vehicleId: req.body.vehicleId, serviceType: req.body.serviceType, notes },
        });
      }

      return res.status(400).render('error', {
        title: 'Invalid Request',
        message: 'That service request link is not valid.',
      });
    }

    const vehicle = await loadVehiclePage(vehicleId, userId);

    if (!vehicle) {
      if (isDashboardSubmission) {
        return renderDashboardView(res.status(404), {
          ...dashboardData,
          serviceRequestError: 'That vehicle could not be found.',
          serviceRequestForm: { vehicleId: req.body.vehicleId, serviceType: req.body.serviceType, notes },
        });
      }

      return res.status(404).render('error', {
        title: 'Vehicle Not Found',
        message: 'No vehicle was found for that listing yet.',
      });
    }

    if (!serviceType) {
      if (isDashboardSubmission) {
        return renderDashboardView(res.status(400), {
          ...dashboardData,
          serviceRequestError: 'Choose a valid service type.',
          serviceRequestForm: { vehicleId: req.body.vehicleId, serviceType: req.body.serviceType, notes },
        });
      }

      return renderVehicleView(res.status(400), {
        ...vehicle,
        serviceRequestError: 'Choose a valid service type.',
        serviceRequestForm: { serviceType: req.body.serviceType, notes },
      });
    }

    if (!notes) {
      if (isDashboardSubmission) {
        return renderDashboardView(res.status(400), {
          ...dashboardData,
          serviceRequestError: 'Add a short description of the issue or service needed.',
          serviceRequestForm: { vehicleId: req.body.vehicleId, serviceType: req.body.serviceType, notes },
        });
      }

      return renderVehicleView(res.status(400), {
        ...vehicle,
        serviceRequestError: 'Add a short description of the issue or service needed.',
        serviceRequestForm: { serviceType, notes },
      });
    }

    const requestResult = await pool.query(
      `
        INSERT INTO service_requests (user_id, vehicle_id, service_type, notes, status)
        VALUES ($1, $2, $3, $4, 'Submitted')
        RETURNING id
      `,
      [userId, vehicleId, serviceType, notes]
    );

    await pool.query(
      `
        INSERT INTO service_request_history (service_request_id, status, note)
        VALUES ($1, 'Submitted', 'Request submitted by customer.')
      `,
      [requestResult.rows[0].id]
    );

    req.session.notice = 'Your service request was submitted.';
    return res.redirect('/dashboard');
  } catch (error) {
    return next(error);
  }
}