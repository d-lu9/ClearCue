CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  patient_secret_hash TEXT NOT NULL UNIQUE,
  caregiver_secret_hash TEXT UNIQUE,
  caregiver_push_token TEXT,
  caregiver_language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  paused INTEGER NOT NULL DEFAULT 1,
  invite_hash TEXT UNIQUE,
  invite_expires_at INTEGER,
  invite_day TEXT,
  invite_count INTEGER NOT NULL DEFAULT 0,
  last_sync_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS doses (
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  dose_id TEXT NOT NULL,
  minute_of_day INTEGER NOT NULL,
  PRIMARY KEY (plan_id, dose_id)
);

CREATE TABLE IF NOT EXISTS dose_records (
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  dose_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (plan_id, dose_id, local_date)
);

CREATE TABLE IF NOT EXISTS alerts (
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  dose_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  PRIMARY KEY (plan_id, dose_id, local_date)
);

CREATE TABLE IF NOT EXISTS pairing_attempts (
  ip_hash TEXT NOT NULL,
  hour_bucket INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_plans_ready ON plans(paused, last_sync_at);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_at ON alerts(sent_at);
CREATE INDEX IF NOT EXISTS idx_dose_records_date ON dose_records(local_date);
