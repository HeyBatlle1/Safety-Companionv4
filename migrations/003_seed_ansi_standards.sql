-- 003_seed_ansi_standards.sql
-- Curated ANSI safety standards, harvested from the Safety Companion V1 database
-- (the same OG backup that seeded the BLS baselines). Reference data only — the
-- broken V1 probability math (stacked multipliers, pinned-100 scores) was NOT
-- carried over; only this clean, curated standards content was.
--
-- Purpose: let the engine surface the applicable ANSI standard alongside its OSHA
-- citation for a hazard (e.g. a fall hazard -> ANSI Z359.1; eye protection on
-- glass work -> ANSI Z87.1). Pure reference; does not feed the calibration math.
--
-- 10 rows. Idempotent via ON CONFLICT (standard_number).

create table if not exists sc_ansi_standards (
    standard_number         text primary key,
    title                   text not null,
    category                text not null,
    industry_applications   text[],
    compliance_requirements jsonb,
    data_source             text not null default 'ANSI_V1_curated',
    created_at              timestamptz not null default now()
);

create index if not exists sc_ansi_standards_category_idx
    on sc_ansi_standards (category);

insert into sc_ansi_standards
    (standard_number, title, category, industry_applications, compliance_requirements)
values
    ('ANSI Z87.1', 'Occupational and Educational Personal Eye and Face Protection Devices',
     'PPE', array['construction','manufacturing','glass_glazing'],
     '{"marking": "Z87_plus", "testing": "ANSI_certified", "impact_resistance": "required"}'::jsonb),

    ('ANSI Z89.1', 'American National Standard for Industrial Head Protection',
     'PPE', array['construction','electrical','general_industry'],
     '{"type_classification": ["Type_I", "Type_II"], "class_classification": ["Class_E", "Class_G", "Class_C"]}'::jsonb),

    ('ANSI A10.8', 'Safety Requirements for Scaffolding',
     'Fall Protection', array['construction','maintenance'],
     '{"guardrails": "required_above_6ft", "inspection": "daily", "load_capacity": "4x_intended_load"}'::jsonb),

    ('ANSI A14.1', 'Safety Requirements for Portable Wood Ladders',
     'Fall Protection', array['construction','maintenance'],
     '{"inspection": "before_each_use", "duty_rating": ["Type_I", "Type_II", "Type_III"]}'::jsonb),

    ('ANSI A14.2', 'Safety Requirements for Portable Metal Ladders',
     'Fall Protection', array['construction','electrical'],
     '{"weight_limit": "duty_rating_based", "electrical_rating": "non_conductive"}'::jsonb),

    ('ANSI Z359.1', 'Safety Requirements for Personal Fall Arrest Systems, Subsystems and Components',
     'Fall Protection', array['construction','roofing','glass_glazing'],
     '{"inspection": "before_each_use", "arrest_force": "1800_lbs_max", "deceleration_distance": "3.5_ft_max"}'::jsonb),

    ('ANSI A92.2', 'Vehicle-Mounted Elevating and Rotating Aerial Devices',
     'Equipment Safety', array['construction','utility','tree_care'],
     '{"fall_protection": "required_above_6ft", "platform_capacity": "rated_load"}'::jsonb),

    ('ANSI B56.1', 'Safety Standard for Low Lift and High Lift Trucks',
     'Equipment Safety', array['construction','warehousing'],
     '{"daily_inspection": "mandatory", "operator_training": "required"}'::jsonb),

    ('ANSI Z535.1', 'Safety Colors',
     'Safety Communication', array['all_industries'],
     '{"danger": "red", "safety": "green", "caution": "yellow", "information": "blue"}'::jsonb),

    ('ANSI Z535.4', 'Product Safety Signs and Labels',
     'Safety Communication', array['manufacturing','construction'],
     '{"pictorials": "ISO_compliant", "signal_words": ["DANGER", "WARNING", "CAUTION"]}'::jsonb)

on conflict (standard_number) do update set
    title                   = excluded.title,
    category                = excluded.category,
    industry_applications   = excluded.industry_applications,
    compliance_requirements = excluded.compliance_requirements;
