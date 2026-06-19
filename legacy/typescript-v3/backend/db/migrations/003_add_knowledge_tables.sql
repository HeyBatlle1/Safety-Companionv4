-- V1 Knowledge Base Tables Migration
-- Ports V1's OSHA safety data schema to Neon
-- Source: V1's shared/schema.ts

-- Table 1: OSHA Injury Rates (BLS construction industry data)
CREATE TABLE IF NOT EXISTS osha_injury_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    naics_code TEXT NOT NULL,
    industry_name TEXT NOT NULL,
    injury_rate DECIMAL(5,2),  -- Per 100 workers, nullable for fatality records
    total_cases INTEGER,
    data_source TEXT NOT NULL,  -- 'BLS_Table_1_2023' or 'BLS_FATALITIES_A1_2023'
    year INTEGER NOT NULL DEFAULT 2023,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(naics_code, data_source, year)
);

CREATE INDEX IF NOT EXISTS idx_osha_injury_naics ON osha_injury_rates(naics_code);
CREATE INDEX IF NOT EXISTS idx_osha_injury_source ON osha_injury_rates(data_source);
CREATE INDEX IF NOT EXISTS idx_osha_injury_rate ON osha_injury_rates(injury_rate);

-- Table 2: Industry Benchmarks (aggregated risk profiles)
CREATE TABLE IF NOT EXISTS industry_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    naics_code TEXT NOT NULL UNIQUE,
    industry_name TEXT NOT NULL,
    avg_injury_rate INTEGER,  -- Per 100 workers
    avg_fatality_rate INTEGER,  -- Per 100,000 workers
    risk_profile JSONB,
    safety_recommendations JSONB,
    benchmark_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_benchmark_naics ON industry_benchmarks(naics_code);
CREATE INDEX IF NOT EXISTS idx_benchmark_injury_rate ON industry_benchmarks(avg_injury_rate);

-- Table 3: JHSA Templates (user-generated, starts empty)
CREATE TABLE IF NOT EXISTS jhsa_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    naics_code TEXT NOT NULL,
    job_title TEXT NOT NULL,
    industry_name TEXT NOT NULL,
    risk_score INTEGER,
    risk_category TEXT,  -- 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'
    job_steps JSONB NOT NULL,
    hazard_analysis JSONB,
    osha_compliance TEXT DEFAULT 'OSHA 3071 Methodology',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jhsa_user ON jhsa_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_jhsa_naics ON jhsa_templates(naics_code);
CREATE INDEX IF NOT EXISTS idx_jhsa_risk ON jhsa_templates(risk_score);

-- Table 4: Safety Intelligence (AI analysis cache, starts empty)
CREATE TABLE IF NOT EXISTS safety_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES analysis_history(id) ON DELETE CASCADE,
    naics_code TEXT NOT NULL,
    query TEXT,
    ai_response TEXT,
    risk_factors JSONB,
    recommendations JSONB,
    confidence_score INTEGER,  -- 0-100
    osha_data_used JSONB,
    industry_comparison JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_safety_intel_user ON safety_intelligence(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_intel_naics ON safety_intelligence(naics_code);
CREATE INDEX IF NOT EXISTS idx_safety_intel_confidence ON safety_intelligence(confidence_score);
