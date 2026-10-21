-- SiteSentinel database schema (PostgreSQL)
-- Create a database named site_risk in pgAdmin first, then run this script inside it.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  job_title VARCHAR(100) NOT NULL DEFAULT 'Site Team Member',
  phone VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(150),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  workers_total INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS analyses (
  id SERIAL PRIMARY KEY,
  site_id INT NOT NULL REFERENCES sites(id),
  score INT NOT NULL,
  level VARCHAR(20) NOT NULL,
  image_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hazards (
  id SERIAL PRIMARY KEY,
  analysis_id INT NOT NULL REFERENCES analyses(id),
  category VARCHAR(50),
  severity VARCHAR(20),
  description VARCHAR(255),
  risk DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  analysis_id INT NOT NULL REFERENCES analyses(id),
  message VARCHAR(255),
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sites (name, location, latitude, longitude, workers_total)
SELECT * FROM (VALUES
  ('Site A', 'Vijayawada', 16.5062, 80.648, 40),
  ('Site B', 'Guntur', 16.3067, 80.4365, 25)
) AS seed(name, location, latitude, longitude, workers_total)
WHERE NOT EXISTS (SELECT 1 FROM sites);
