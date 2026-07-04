INSERT INTO roles (name)
VALUES ('standard'), ('secondary'), ('owner')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name)
VALUES ('Sedan'), ('SUV'), ('Truck')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (display_name, email, password_hash, role_id)
VALUES
	('Standard Customer', 'customer@example.com', '$2b$10$4y9YXW37RULO7wKAhFlD3e/N38geas/bfIJp5XpkzgxWVlV7riyw6', (SELECT id FROM roles WHERE name = 'standard')),
	('Service Advisor', 'advisor@example.com', '$2b$10$4y9YXW37RULO7wKAhFlD3e/N38geas/bfIJp5XpkzgxWVlV7riyw6', (SELECT id FROM roles WHERE name = 'secondary')),
	('Owner Admin', 'owner@example.com', '$2b$10$4y9YXW37RULO7wKAhFlD3e/N38geas/bfIJp5XpkzgxWVlV7riyw6', (SELECT id FROM roles WHERE name = 'owner'))
ON CONFLICT (email) DO NOTHING;

INSERT INTO vehicles (category_id, year, make, model, mileage, price, description, is_available)
VALUES
	((SELECT id FROM categories WHERE name = 'Sedan' LIMIT 1), 2021, 'Honda', 'Accord', 24850, 23995.00, 'Clean midsize sedan with a comfortable interior and strong fuel economy.', TRUE),
	((SELECT id FROM categories WHERE name = 'SUV' LIMIT 1), 2022, 'Toyota', 'RAV4', 18220, 28950.00, 'Versatile compact SUV with advanced driver assistance features.', TRUE),
	((SELECT id FROM categories WHERE name = 'Truck' LIMIT 1), 2020, 'Ford', 'F-150', 40110, 34995.00, 'Well-maintained pickup with towing package and crew cab seating.', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_images (vehicle_id, image_url, alt_text)
VALUES
	((SELECT id FROM vehicles WHERE make = 'Honda' AND model = 'Accord' LIMIT 1), 'https://images.unsplash.com/photo-1503376780353-7e6692767b70', 'Honda Accord front view'),
	((SELECT id FROM vehicles WHERE make = 'Toyota' AND model = 'RAV4' LIMIT 1), 'https://images.unsplash.com/photo-1550355291-bbee04a92027', 'Toyota RAV4 front view'),
	((SELECT id FROM vehicles WHERE make = 'Ford' AND model = 'F-150' LIMIT 1), 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c', 'Ford F-150 front view')
ON CONFLICT DO NOTHING;

INSERT INTO reviews (user_id, vehicle_id, rating, comment, status)
VALUES
	((SELECT id FROM users WHERE email = 'customer@example.com' LIMIT 1), (SELECT id FROM vehicles WHERE make = 'Honda' AND model = 'Accord' LIMIT 1), 5, 'Smooth ride and very clean inside.', 'Pending'),
	((SELECT id FROM users WHERE email = 'customer@example.com' LIMIT 1), (SELECT id FROM vehicles WHERE make = 'Toyota' AND model = 'RAV4' LIMIT 1), 4, 'Great space and visibility for daily driving.', 'Approved')
ON CONFLICT (user_id, vehicle_id) DO NOTHING;

INSERT INTO service_requests (user_id, vehicle_id, service_type, notes, status)
VALUES
	((SELECT id FROM users WHERE email = 'customer@example.com' LIMIT 1), (SELECT id FROM vehicles WHERE make = 'Honda' AND model = 'Accord' LIMIT 1), 'Inspection', 'Please check the brakes and tires before pickup.', 'Submitted')
ON CONFLICT DO NOTHING;

INSERT INTO service_request_history (service_request_id, status, note)
VALUES
	((SELECT id FROM service_requests WHERE notes = 'Please check the brakes and tires before pickup.' LIMIT 1), 'Submitted', 'Request submitted by customer.')
ON CONFLICT DO NOTHING;