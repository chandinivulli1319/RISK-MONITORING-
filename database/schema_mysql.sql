-- SiteSentinel database schema (MySQL / MariaDB)
CREATE DATABASE IF NOT EXISTS site_risk;
USE site_risk;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  job_title VARCHAR(100) NOT NULL DEFAULT 'Site Team Member',
  phone VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(150),
  latitude DOUBLE,
  longitude DOUBLE,
  workers_total INT DEFAULT 0
);

-- One row each time a site is analyzed (a snapshot of the score).
-- image_path is filled when the analysis came from a photo.
CREATE TABLE IF NOT EXISTS analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  score INT NOT NULL,
  level VARCHAR(20) NOT NULL,
  image_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- The hazards that were counted in each analysis
CREATE TABLE IF NOT EXISTS hazards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  analysis_id INT NOT NULL,
  category VARCHAR(50),
  severity VARCHAR(20),
  description VARCHAR(255),
  risk DOUBLE,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  analysis_id INT NOT NULL,
  message VARCHAR(255),
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id)
);

-- Sample sites (only added if the table is empty)
INSERT INTO sites (name, location, latitude, longitude, workers_total)
SELECT * FROM (
  SELECT 'Site A' AS name, 'Vijayawada' AS location, 16.5062 AS latitude, 80.648 AS longitude, 40 AS workers_total
  UNION ALL
  SELECT 'Site B', 'Guntur', 16.3067, 80.4365, 25
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM sites);
