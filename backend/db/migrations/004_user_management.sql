-- User Management Tables for RBAC
-- Run with: psql $DATABASE_URL -f 004_user_management.sql

-- Users table (extends Clerk with app-specific data)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,  -- Clerk auth ID
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('master_admin', 'safety_director', 'project_manager', 'foreman', 'field_worker')),
  
  -- Hierarchy
  reports_to UUID REFERENCES users(id),
  assigned_project_manager UUID REFERENCES users(id),
  
  -- Profile
  phone TEXT,
  certifications JSONB DEFAULT '[]'::jsonb,
  emergency_contact JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to);
CREATE INDEX IF NOT EXISTS idx_users_assigned_pm ON users(assigned_project_manager);

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  project_manager_id UUID REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_sites_pm ON sites(project_manager_id);

-- Site assignments (many-to-many users<->sites)
CREATE TABLE IF NOT EXISTS site_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_site_assignments_user ON site_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_site_assignments_site ON site_assignments(site_id);

-- Row Level Security (optional extra layer)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Policies can be added based on app requirements
