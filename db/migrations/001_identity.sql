-- 001_identity.sql
-- Memisahkan akun (users) dari data karyawan (employees), menambah refresh_tokens,
-- dan mengganti peran 'admin' menjadi 'hr' sesuai kontrak.

-- 1. Tabel employees
CREATE TABLE employees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(20) UNIQUE,
  name              VARCHAR(100) NOT NULL,
  position          VARCHAR(100),
  department        VARCHAR(100),
  office_id         UUID REFERENCES offices(id) ON DELETE RESTRICT,
  supervisor_1_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  supervisor_2_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  contract_end_date DATE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- tidak boleh menjadi atasan diri sendiri (NULL dianggap lolos)
  CONSTRAINT chk_no_self_supervisor CHECK (supervisor_1_id <> id AND supervisor_2_id <> id)
);

CREATE INDEX idx_employees_supervisor_1 ON employees (supervisor_1_id);
CREATE INDEX idx_employees_supervisor_2 ON employees (supervisor_2_id);

-- 2. Lepas aturan lama sebelum peran diganti
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_employee_has_office;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD COLUMN employee_id          UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Pindahkan data: tiap akun employee dibuatkan satu baris employees
ALTER TABLE employees ADD COLUMN legacy_user_id UUID; -- penghubung sementara

INSERT INTO employees (code, name, position, department, office_id, contract_end_date, legacy_user_id)
SELECT employee_code, name, job_title, department, office_id, contract_end_date, id
FROM users
WHERE role = 'employee';

UPDATE users u
SET employee_id = e.id
FROM employees e
WHERE e.legacy_user_id = u.id;

ALTER TABLE employees DROP COLUMN legacy_user_id;

-- 4. Peran sesuai kontrak dan aturan baru
UPDATE users SET role = 'hr' WHERE role = 'admin';

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('employee', 'hr')),
  -- akun HR boleh tanpa data karyawan, akun employee wajib punya
  ADD CONSTRAINT chk_employee_has_record CHECK (role = 'hr' OR employee_id IS NOT NULL);

CREATE UNIQUE INDEX uq_users_employee ON users (employee_id) WHERE employee_id IS NOT NULL;

-- 5. Refresh token. Yang disimpan hanya hash-nya, tidak pernah tokennya
DROP TABLE IF EXISTS refresh_tokens;
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id   VARCHAR(100) NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  replaced_by UUID REFERENCES refresh_tokens(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_device ON refresh_tokens (user_id, device_id);