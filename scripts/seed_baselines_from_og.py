#!/usr/bin/env python3
"""
Extract real BLS/OSHA injury-rate data (NAICS-keyed) from the OG database backup
and generate a clean seed migration for sc_industry_baselines.

WHY: the calibration engine converts injury_rate_per_100 (annual TRIR) to per-shift.
sc_industry_baselines is currently EMPTY, so the engine falls back to a 0.03 default.
This seeds it with real, per-industry, NAICS-keyed BLS Table 1 (2023) rates that an
earlier Claude session already harvested. Public-domain federal data — clean provenance.

The OG dump stores data as a Postgres COPY block (tab-separated), not INSERTs.
This parses that block and emits INSERTs against the current sc_ schema.
"""
import sys, os

OG_DUMP = os.path.expanduser("~/Downloads/OG_full_backup_20260819_1808.sql")
OUT = os.path.expanduser("~/Safety-Compv3/migrations/002_seed_baselines.sql")
COPY_MARKER = "COPY public.osha_injury_rates "

def sql_str(v):
    if v == r"\N" or v is None:
        return "NULL"
    return "'" + v.replace("'", "''") + "'"

def sql_num(v):
    if v == r"\N" or v is None or v == "":
        return "NULL"
    return v

def main():
    if not os.path.exists(OG_DUMP):
        sys.exit(f"OG dump not found at {OG_DUMP}")
    rows = []
    with open(OG_DUMP, "r", encoding="utf-8", errors="replace") as f:
        in_block = False
        for line in f:
            if line.startswith(COPY_MARKER):
                in_block = True
                continue
            if in_block:
                if line.startswith(r"\."):
                    break
                cols = line.rstrip("\n").split("\t")
                if len(cols) < 12:
                    continue
                (_id, naics, industry, year, total_cases, injury_rate,
                 _days, _transfer, _hours, data_source, _raw, _created) = cols[:12]
                if injury_rate in (r"\N", "", None):
                    continue
                rows.append({
                    "naics": naics, "industry": industry, "year": year,
                    "rate": injury_rate, "total_cases": total_cases,
                    "data_source": data_source if data_source != r"\N" else "BLS",
                })
    if not rows:
        sys.exit("No usable rows parsed - check the COPY block / column order.")
    with open(OUT, "w", encoding="utf-8") as out:
        out.write("-- 002_seed_baselines.sql\n")
        out.write("-- Real BLS/OSHA injury rates, NAICS-keyed, harvested from the OG database\n")
        out.write("-- (originally collected by an earlier Claude session; public-domain federal data).\n")
        out.write("-- Feeds sc_industry_baselines so calibration converts REAL per-industry TRIR to\n")
        out.write("-- per-shift instead of the 0.03 fallback.\n")
        out.write(f"-- {len(rows)} rows. Idempotent via ON CONFLICT (naics_code, year, data_source).\n\n")
        out.write("insert into sc_industry_baselines\n")
        out.write("  (naics_code, industry_name, year, injury_rate_per_100, total_cases, data_source)\nvalues\n")
        vals = []
        for r in rows:
            vals.append(
                f"  ({sql_str(r['naics'])}, {sql_str(r['industry'])}, "
                f"{sql_num(r['year'])}, {sql_num(r['rate'])}, "
                f"{sql_num(r['total_cases'])}, {sql_str(r['data_source'])})"
            )
        out.write(",\n".join(vals))
        out.write("\non conflict (naics_code, year, data_source) do update\n")
        out.write("  set injury_rate_per_100 = excluded.injury_rate_per_100,\n")
        out.write("      industry_name = excluded.industry_name,\n")
        out.write("      total_cases = excluded.total_cases;\n")
    print(f"OK wrote {len(rows)} baseline rows -> {OUT}")
    con = [r for r in rows if "onstruction" in r["industry"]][:5]
    print("sample construction rows:")
    for r in con:
        print(f"  NAICS {r['naics']:<6} {r['industry'][:45]:<45} rate={r['rate']}")

if __name__ == "__main__":
    main()
