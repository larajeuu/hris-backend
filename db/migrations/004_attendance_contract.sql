-- Menyesuaikan jadwal dan absensi dengan kontrak API (kunci karyawan = employees.id)
DROP TABLE IF EXISTS attendances;
DROP TABLE IF EXISTS work_schedules;

ALTER TABLE shifts
  ADD COLUMN code VARCHAR(20),
  ADD COLUMN late_tolerance_min INTEGER NOT NULL DEFAULT 0
    CHECK (late_tolerance_min BETWEEN 0 AND 120);

UPDATE shifts SET code = CASE name
  WHEN 'Office' THEN 'office'
  WHEN 'Pagi'   THEN 'morning'
  WHEN 'Siang'  THEN 'afternoon'
  WHEN 'Malam'  THEN 'night'
  ELSE LOWER(name)
END;

ALTER TABLE shifts ALTER COLUMN code SET NOT NULL;
ALTER TABLE shifts ADD CONSTRAINT uq_shifts_code UNIQUE (code);

-- Pengaturan: satu baris per kunci (selfie dan lokasi palsu dimatikan untuk checkpoint)
CREATE TABLE settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        VARCHAR(100) NOT NULL UNIQUE,
  value      JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value)
VALUES ('attendance', '{"max_accuracy_m": 30, "selfie_required": false, "reject_mock": false}');

-- Jadwal harian per karyawan. Tidak ada baris di suatu tanggal berarti libur
CREATE TABLE work_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  work_date   DATE NOT NULL,
  shift_id    UUID NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_schedule_employee_date UNIQUE (employee_id, work_date)
);

CREATE INDEX idx_schedules_date ON work_schedules (work_date);

-- Absensi: satu baris per karyawan per hari (tanggal = tanggal shift dimulai)
CREATE TABLE attendances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  office_id      UUID NOT NULL REFERENCES offices(id) ON DELETE RESTRICT,
  shift_id       UUID NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  work_date      DATE NOT NULL,
  clock_in       TIMESTAMPTZ,
  clock_out      TIMESTAMPTZ,
  in_lat         DOUBLE PRECISION,
  in_lng         DOUBLE PRECISION,
  in_accuracy_m  DOUBLE PRECISION,
  in_distance_m  DOUBLE PRECISION,
  out_lat        DOUBLE PRECISION,
  out_lng        DOUBLE PRECISION,
  out_accuracy_m DOUBLE PRECISION,
  out_distance_m DOUBLE PRECISION,
  selfie_file_id UUID, -- diisi saat fitur selfie dibuat (setelah checkpoint)
  status         VARCHAR(20) NOT NULL
                 CHECK (status IN ('present','late','incomplete','absent','wfh',
                                   'business_trip','leave','permit','off')),
  late_minutes   INTEGER NOT NULL DEFAULT 0,
  request_id     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, work_date),
  CONSTRAINT chk_clock_order CHECK (clock_out IS NULL OR clock_in IS NULL OR clock_out >= clock_in)
);

CREATE INDEX idx_attendances_date ON attendances (work_date);