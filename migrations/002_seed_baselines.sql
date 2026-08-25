-- 002_seed_baselines.sql
-- Real BLS/OSHA injury rates, NAICS-keyed, harvested from the OG database
-- (originally collected by an earlier Claude session; public-domain federal data).
-- Feeds sc_industry_baselines so calibration converts REAL per-industry TRIR to
-- per-shift instead of the 0.03 fallback.
-- 35 rows. Idempotent via ON CONFLICT (naics_code, year, data_source).

insert into sc_industry_baselines
  (naics_code, industry_name, year, injury_rate_per_100, total_cases, data_source)
values
  ('23', 'Construction', 2023, 2.3, NULL, 'BLS_Table_1_2023'),
  ('236', 'Construction of buildings', 2023, 2.1, NULL, 'BLS_Table_1_2023'),
  ('2361', 'Residential building construction', 2023, 2.5, NULL, 'BLS_Table_1_2023'),
  ('2362', 'Nonresidential building construction', 2023, 1.6, NULL, 'BLS_Table_1_2023'),
  ('237', 'Heavy and civil engineering construction', 2023, 1.9, NULL, 'BLS_Table_1_2023'),
  ('2371', 'Utility system construction', 2023, 1.6, NULL, 'BLS_Table_1_2023'),
  ('23711', 'Water and sewer line and related structures construction', 2023, 2.6, NULL, 'BLS_Table_1_2023'),
  ('23712', 'Oil and gas pipeline and related structures construction', 2023, 0.5, NULL, 'BLS_Table_1_2023'),
  ('23713', 'Power and communication line and related structures construction', 2023, 1.6, NULL, 'BLS_Table_1_2023'),
  ('2372', 'Land subdivision', 2023, 1.7, NULL, 'BLS_Table_1_2023'),
  ('2373', 'Highway, street, and bridge construction', 2023, 2.5, NULL, 'BLS_Table_1_2023'),
  ('2379', 'Other heavy and civil engineering construction', 2023, 1.4, NULL, 'BLS_Table_1_2023'),
  ('238', 'Specialty trade contractors', 2023, 2.5, NULL, 'BLS_Table_1_2023'),
  ('2381', 'Foundation, structure, and building exterior contractors', 2023, 3.2, NULL, 'BLS_Table_1_2023'),
  ('23811', 'Poured concrete foundation and structure contractors', 2023, 2.8, NULL, 'BLS_Table_1_2023'),
  ('23812', 'Structural steel and precast concrete contractors', 2023, 3.6, NULL, 'BLS_Table_1_2023'),
  ('23813', 'Framing contractors', 2023, 5.5, NULL, 'BLS_Table_1_2023'),
  ('23814', 'Masonry contractors', 2023, 2.7, NULL, 'BLS_Table_1_2023'),
  ('23815', 'Glass and glazing contractors', 2023, 2.5, NULL, 'BLS_Table_1_2023'),
  ('23816', 'Roofing contractors', 2023, 3.2, NULL, 'BLS_Table_1_2023'),
  ('23817', 'Siding contractors', 2023, 5.8, NULL, 'BLS_Table_1_2023'),
  ('2382', 'Building equipment contractors', 2023, 2.4, NULL, 'BLS_Table_1_2023'),
  ('23821', 'Electrical contractors and other wiring installation contractors', 2023, 2.0, NULL, 'BLS_Table_1_2023'),
  ('23822', 'Plumbing, heating, and air-conditioning contractors', 2023, 2.9, NULL, 'BLS_Table_1_2023'),
  ('23829', 'Other building equipment contractors', 2023, 1.8, NULL, 'BLS_Table_1_2023'),
  ('2383', 'Building finishing contractors', 2023, 2.5, NULL, 'BLS_Table_1_2023'),
  ('23831', 'Drywall and insulation contractors', 2023, 3.6, NULL, 'BLS_Table_1_2023'),
  ('23832', 'Painting and wall covering contractors', 2023, 1.6, NULL, 'BLS_Table_1_2023'),
  ('23833', 'Flooring contractors', 2023, 2.4, NULL, 'BLS_Table_1_2023'),
  ('23834', 'Tile and terrazzo contractors', 2023, 1.5, NULL, 'BLS_Table_1_2023'),
  ('23835', 'Finish carpentry contractors', 2023, 2.4, NULL, 'BLS_Table_1_2023'),
  ('23839', 'Other building finishing contractors', 2023, 2.7, NULL, 'BLS_Table_1_2023'),
  ('2389', 'Other specialty trade contractors', 2023, 1.8, NULL, 'BLS_Table_1_2023'),
  ('23891', 'Site preparation contractors', 2023, 1.9, NULL, 'BLS_Table_1_2023'),
  ('23899', 'All other specialty trade contractors', 2023, 1.7, NULL, 'BLS_Table_1_2023')
on conflict (naics_code, year, data_source) do update
  set injury_rate_per_100 = excluded.injury_rate_per_100,
      industry_name = excluded.industry_name,
      total_cases = excluded.total_cases;
