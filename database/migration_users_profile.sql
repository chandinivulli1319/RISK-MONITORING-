-- Run this ONCE in phpMyAdmin (SQL tab) on your existing site_risk database.
-- It adds the two extra fields used by the Profile page.
-- If phpMyAdmin says "Duplicate column name", it was already done: nothing more to do.
USE site_risk;

ALTER TABLE users
  ADD COLUMN job_title VARCHAR(100) NOT NULL DEFAULT 'Site Team Member',
  ADD COLUMN phone VARCHAR(30) NULL;
