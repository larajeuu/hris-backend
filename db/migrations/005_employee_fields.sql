ALTER TABLE employees
  ADD COLUMN default_shift   VARCHAR(20),
  ADD COLUMN annual_quota    INTEGER NOT NULL DEFAULT 12 CHECK (annual_quota >= 0),
  ADD COLUMN quota_remaining NUMERIC(4,1) NOT NULL DEFAULT 12 CHECK (quota_remaining >= 0);

UPDATE employees SET default_shift = 'morning' WHERE default_shift IS NULL;