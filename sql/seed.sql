INSERT INTO roles (name)
VALUES ('standard'), ('secondary'), ('owner')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name)
VALUES ('Sedan'), ('SUV'), ('Truck')
ON CONFLICT (name) DO NOTHING;