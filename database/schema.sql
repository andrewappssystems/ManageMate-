CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  role VARCHAR(20) DEFAULT 'User',
  password_hash TEXT,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS landlords (
  id SERIAL PRIMARY KEY,
  landlord_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(200),
  address TEXT,
  bank_name VARCHAR(200),
  bank_account VARCHAR(200),
  commission_rate NUMERIC(6,2) DEFAULT 10,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  landlord_id VARCHAR(20) REFERENCES landlords(landlord_id) ON DELETE SET NULL,
  address TEXT,
  type VARCHAR(50) DEFAULT 'Residential',
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  unit_id VARCHAR(20) UNIQUE NOT NULL,
  property_id VARCHAR(20) REFERENCES properties(property_id) ON DELETE SET NULL,
  unit_number VARCHAR(100) NOT NULL,
  type VARCHAR(50) DEFAULT 'Studio',
  rent NUMERIC(15,2) DEFAULT 0,
  description TEXT,
  status VARCHAR(20) DEFAULT 'Vacant',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(200),
  id_number VARCHAR(100),
  unit_id VARCHAR(20) REFERENCES units(unit_id) ON DELETE SET NULL,
  lease_start DATE,
  lease_end DATE,
  rent_amount NUMERIC(15,2) DEFAULT 0,
  deposit NUMERIC(15,2) DEFAULT 0,
  emergency_name VARCHAR(200),
  emergency_phone VARCHAR(50),
  next_of_kin_name VARCHAR(200),
  next_of_kin_phone VARCHAR(50),
  next_of_kin_rel VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS rent_collection (
  id SERIAL PRIMARY KEY,
  rent_id VARCHAR(20) UNIQUE NOT NULL,
  tenant_id VARCHAR(20) REFERENCES tenants(tenant_id) ON DELETE SET NULL,
  unit_id VARCHAR(20) REFERENCES units(unit_id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL,
  month VARCHAR(2),
  year INTEGER,
  payment_method VARCHAR(50) DEFAULT 'Cash',
  reference VARCHAR(200),
  payment_type VARCHAR(20) DEFAULT 'Full',
  balance_before NUMERIC(15,2) DEFAULT 0,
  balance_after NUMERIC(15,2) DEFAULT 0,
  expected_amount NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  expense_id VARCHAR(20) UNIQUE NOT NULL,
  property_id VARCHAR(20) REFERENCES properties(property_id) ON DELETE SET NULL,
  category VARCHAR(100) DEFAULT 'Other',
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_id VARCHAR(30) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  entity_name VARCHAR(200),
  description TEXT,
  amount NUMERIC(15,2) NOT NULL,
  month VARCHAR(2),
  year INTEGER,
  status VARCHAR(20) DEFAULT 'Unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  receipt_id VARCHAR(30) UNIQUE NOT NULL,
  rent_id VARCHAR(30),
  tenant_name VARCHAR(200) NOT NULL,
  unit_number VARCHAR(100),
  amount NUMERIC(15,2) NOT NULL,
  month VARCHAR(2),
  year INTEGER,
  payment_method VARCHAR(50) DEFAULT 'Cash',
  payment_type VARCHAR(20) DEFAULT 'Full',
  balance_carried NUMERIC(15,2) DEFAULT 0,
  expected_amount NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS rent_balances (
  tenant_id VARCHAR(20) PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  carried_balance NUMERIC(15,2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rent_increase_history (
  id SERIAL PRIMARY KEY,
  increase_id VARCHAR(20) UNIQUE,
  unit_id VARCHAR(20),
  tenant_id VARCHAR(20),
  old_rent NUMERIC(15,2),
  new_rent NUMERIC(15,2),
  effective_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS archive (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(20) NOT NULL,
  entity_label VARCHAR(200),
  data JSONB NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS verifications (
  code VARCHAR(32) PRIMARY KEY,
  doc_id VARCHAR(200) NOT NULL,
  doc_type VARCHAR(50),
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_archive_type ON archive(entity_type);
CREATE INDEX IF NOT EXISTS idx_archive_label ON archive(entity_label);
CREATE INDEX IF NOT EXISTS idx_archive_date ON archive(deleted_at);
CREATE INDEX IF NOT EXISTS idx_verifications_doc_id ON verifications(doc_id);
CREATE INDEX IF NOT EXISTS idx_verifications_doc_type ON verifications(doc_type);

INSERT INTO users (user_id, username, full_name, email, role, password_hash, status, created_by)
VALUES ('USR-001', 'admin', 'Administrator', 'admin@example.com', 'Admin', '', 'Active', 'Seed')
ON CONFLICT (username) DO NOTHING;

INSERT INTO settings (key, value) VALUES
  ('company_name', 'ManageMate'),
  ('currency', 'UGX'),
  ('vat_rate', '0')
ON CONFLICT (key) DO NOTHING;
