-- ============================================================
-- Circuit Manager Database Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- ============================================================
-- LOCATIONS & ACCESS
-- ============================================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  icon TEXT DEFAULT 'building',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_owner ON locations(owner_id);

CREATE TABLE location_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_manage_access BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, user_id)
);

CREATE INDEX idx_location_access_location ON location_access(location_id);
CREATE INDEX idx_location_access_user ON location_access(user_id);

-- ============================================================
-- AREAS
-- ============================================================

CREATE TYPE area_type AS ENUM ('structure', 'floor', 'outdoors', 'indoors', 'other');

CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  types area_type[] NOT NULL DEFAULT '{}',
  icon TEXT DEFAULT 'map-pin',
  description TEXT,
  short_code TEXT NOT NULL, -- e.g. H, F, I, O
  sequence_num INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_areas_location ON areas(location_id);
CREATE INDEX idx_areas_parent ON areas(parent_id);

-- Prevent circular references via trigger
CREATE OR REPLACE FUNCTION check_area_circular_ref()
RETURNS TRIGGER AS $$
DECLARE
  v_parent UUID;
  v_depth INTEGER := 0;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'An area cannot be its own parent';
  END IF;
  v_parent := NEW.parent_id;
  WHILE v_parent IS NOT NULL LOOP
    IF v_parent = NEW.id THEN
      RAISE EXCEPTION 'Circular reference detected in area hierarchy';
    END IF;
    SELECT parent_id INTO v_parent FROM areas WHERE id = v_parent;
    v_depth := v_depth + 1;
    IF v_depth > 100 THEN
      RAISE EXCEPTION 'Area hierarchy too deep';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_area_circular_ref
  BEFORE INSERT OR UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION check_area_circular_ref();

-- ============================================================
-- ELECTRICAL SERVICES & PANELS
-- ============================================================

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Service',
  voltage INTEGER DEFAULT 240,
  amperage INTEGER,
  description TEXT,
  icon TEXT DEFAULT 'zap',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_location ON services(location_id);

CREATE TYPE panel_type AS ENUM ('main', 'sub', 'transfer', 'distribution');

CREATE TABLE panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES panels(id) ON DELETE SET NULL,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type panel_type NOT NULL DEFAULT 'main',
  amperage INTEGER,
  voltage INTEGER DEFAULT 240,
  has_main_disconnect BOOLEAN NOT NULL DEFAULT true,
  main_disconnect_label TEXT DEFAULT 'MAIN',
  slots INTEGER DEFAULT 20,
  manufacturer TEXT,
  model TEXT,
  icon TEXT DEFAULT 'cpu',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_panels_service ON panels(service_id);
CREATE INDEX idx_panels_parent ON panels(parent_id);

CREATE TABLE breakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- e.g. "1", "2", "3A", "3B"
  position INTEGER, -- display order
  amperage INTEGER,
  poles INTEGER NOT NULL DEFAULT 1, -- 1 or 2 (double pole)
  voltage INTEGER,
  breaker_type TEXT DEFAULT 'standard', -- standard, gfci, afci, dual
  description TEXT,
  icon TEXT DEFAULT 'toggle-left',
  is_spare BOOLEAN NOT NULL DEFAULT false,
  is_vacant BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_breakers_panel ON breakers(panel_id);

-- ============================================================
-- ASSETS / DEVICES
-- ============================================================

CREATE TABLE asset_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'circle',
  description TEXT,
  category TEXT -- electrical, mechanical, etc.
);

-- Insert default asset types
INSERT INTO asset_types (name, icon, category) VALUES
  ('Outlet (Standard)', 'plug', 'electrical'),
  ('Outlet (GFCI)', 'shield', 'electrical'),
  ('Outlet (20A)', 'plug', 'electrical'),
  ('Outlet (240V)', 'zap', 'electrical'),
  ('Light Switch', 'toggle-left', 'electrical'),
  ('Dimmer Switch', 'sliders', 'electrical'),
  ('3-Way Switch', 'git-branch', 'electrical'),
  ('Light Fixture', 'sun', 'electrical'),
  ('Ceiling Fan', 'wind', 'electrical'),
  ('Air Conditioner', 'thermometer', 'electrical'),
  ('Furnace', 'flame', 'electrical'),
  ('Heat Pump', 'thermometer', 'electrical'),
  ('Water Heater', 'droplets', 'electrical'),
  ('Dishwasher', 'square', 'electrical'),
  ('Refrigerator', 'square', 'electrical'),
  ('Microwave', 'square', 'electrical'),
  ('Garbage Disposal', 'trash', 'electrical'),
  ('Oven/Range', 'flame', 'electrical'),
  ('Washer', 'loader', 'electrical'),
  ('Dryer', 'wind', 'electrical'),
  ('EV Charger', 'zap', 'electrical'),
  ('Smoke Detector', 'bell', 'safety'),
  ('Carbon Monoxide Detector', 'alert-triangle', 'safety'),
  ('Doorbell', 'bell', 'electrical'),
  ('Garage Door Opener', 'square', 'electrical'),
  ('Panel/Subpanel', 'cpu', 'electrical'),
  ('Other', 'circle', 'electrical');

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  breaker_id UUID REFERENCES breakers(id) ON DELETE SET NULL,
  asset_type_id UUID REFERENCES asset_types(id),
  name TEXT NOT NULL,
  system_id TEXT, -- e.g. H1-F2-I3-S4
  description TEXT,
  icon TEXT,
  notes TEXT,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  install_date DATE,
  wattage INTEGER,
  amperage NUMERIC,
  voltage INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_location ON assets(location_id);
CREATE INDEX idx_assets_area ON assets(area_id);
CREATE INDEX idx_assets_breaker ON assets(breaker_id);

-- Full text search index
CREATE INDEX idx_assets_search ON assets USING gin(
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(system_id,'') || ' ' || coalesce(notes,''))
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_locations_updated BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_location_access_updated BEFORE UPDATE ON location_access FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_areas_updated BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_panels_updated BEFORE UPDATE ON panels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_breakers_updated BEFORE UPDATE ON breakers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AREA SEQUENCE COUNTER (for system IDs)
-- ============================================================

CREATE TABLE area_type_counters (
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  type_prefix TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (location_id, type_prefix)
);

CREATE TABLE asset_type_counters (
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  type_prefix TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (location_id, type_prefix)
);
