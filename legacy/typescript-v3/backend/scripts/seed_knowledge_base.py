#!/usr/bin/env python3
"""
V1 Knowledge Base Seeder for Safety Companion V3
Ports V1's seed-osha-data.ts to Python/Neon

Data Source: V1's scripts/seed-osha-data.ts
Records: 36 OSHA injury/fatality records + 2 industry benchmarks = 38 total
"""

import asyncio
import os
import sys
from datetime import datetime

# Add parent path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import asyncpg

# Database URL from environment or default
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://neondb_owner:npg_qGUi6S1NEZar@ep-steep-sun-a5q75vzf-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require')

# ============================================================
# V1 OSHA CONSTRUCTION INJURY DATA (from seed-osha-data.ts)
# Real 2023 BLS Construction Industry Data
# ============================================================

OSHA_INJURY_DATA = [
    # Core Construction Industries - NAICS 23
    {
        "naics_code": "23",
        "industry_name": "Construction",
        "injury_rate": 2.5,
        "total_cases": 195300,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "236",
        "industry_name": "Construction of buildings",
        "injury_rate": 2.3,
        "total_cases": 42100,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "237",
        "industry_name": "Heavy and civil engineering construction",
        "injury_rate": 2.1,
        "total_cases": 28700,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "238",
        "industry_name": "Specialty trade contractors",
        "injury_rate": 2.7,
        "total_cases": 124500,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    
    # Residential Building Construction
    {
        "naics_code": "2361",
        "industry_name": "Residential building construction",
        "injury_rate": 2.4,
        "total_cases": 31200,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "2362",
        "industry_name": "Nonresidential building construction",
        "injury_rate": 2.1,
        "total_cases": 10900,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    
    # Heavy Construction
    {
        "naics_code": "2371",
        "industry_name": "Utility system construction",
        "injury_rate": 2.8,
        "total_cases": 16200,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "2372",
        "industry_name": "Land subdivision",
        "injury_rate": 1.9,
        "total_cases": 1100,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "2373",
        "industry_name": "Highway, street, and bridge construction",
        "injury_rate": 2.2,
        "total_cases": 8900,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "2379",
        "industry_name": "Other heavy and civil engineering construction",
        "injury_rate": 1.8,
        "total_cases": 2500,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    
    # Specialty Trade Contractors (High-Risk Categories)
    {
        "naics_code": "2381",
        "industry_name": "Foundation, structure, and building exterior contractors",
        "injury_rate": 3.1,
        "total_cases": 41200,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23811",
        "industry_name": "Poured concrete foundation and structure contractors",
        "injury_rate": 3.4,
        "total_cases": 8900,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23812",
        "industry_name": "Structural steel and precast concrete contractors",
        "injury_rate": 4.2,
        "total_cases": 7100,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23813",
        "industry_name": "Framing contractors",
        "injury_rate": 3.8,
        "total_cases": 12400,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23814",
        "industry_name": "Masonry contractors",
        "injury_rate": 2.9,
        "total_cases": 6200,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23815",
        "industry_name": "Glass and glazing contractors",
        "injury_rate": 3.5,
        "total_cases": 2800,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23816",
        "industry_name": "Roofing contractors",
        "injury_rate": 4.7,
        "total_cases": 11200,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23817",
        "industry_name": "Siding contractors",
        "injury_rate": 3.2,
        "total_cases": 2100,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23819",
        "industry_name": "Other foundation, structure, and building exterior contractors",
        "injury_rate": 2.6,
        "total_cases": 1400,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    
    # Building Equipment Contractors
    {
        "naics_code": "2382",
        "industry_name": "Building equipment contractors",
        "injury_rate": 2.2,
        "total_cases": 43100,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23821",
        "industry_name": "Electrical contractors and other wiring installation contractors",
        "injury_rate": 2.1,
        "total_cases": 19800,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23822",
        "industry_name": "Plumbing, heating, and air-conditioning contractors",
        "injury_rate": 2.3,
        "total_cases": 23300,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    
    # Building Finishing Contractors
    {
        "naics_code": "2383",
        "industry_name": "Building finishing contractors",
        "injury_rate": 2.4,
        "total_cases": 31800,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23831",
        "industry_name": "Drywall and insulation contractors",
        "injury_rate": 2.8,
        "total_cases": 8900,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23832",
        "industry_name": "Painting and wall covering contractors",
        "injury_rate": 2.1,
        "total_cases": 5200,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23833",
        "industry_name": "Flooring contractors",
        "injury_rate": 2.7,
        "total_cases": 4100,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23834",
        "industry_name": "Tile and terrazzo contractors",
        "injury_rate": 2.5,
        "total_cases": 1800,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23835",
        "industry_name": "Finish carpentry contractors",
        "injury_rate": 2.9,
        "total_cases": 3200,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    {
        "naics_code": "23839",
        "industry_name": "Other building finishing contractors",
        "injury_rate": 2.2,
        "total_cases": 8600,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    
    # Other Specialty Trade Contractors
    {
        "naics_code": "2389",
        "industry_name": "Other specialty trade contractors",
        "injury_rate": 2.8,
        "total_cases": 8400,
        "data_source": "BLS_Table_1_2023",
        "year": 2023
    },
    
    # 2023 Fatality Data (injury_rate is None for fatality records)
    {
        "naics_code": "23",
        "industry_name": "Construction",
        "injury_rate": None,
        "total_cases": 1069,
        "data_source": "BLS_FATALITIES_A1_2023",
        "year": 2023
    },
    {
        "naics_code": "236",
        "industry_name": "Construction of buildings",
        "injury_rate": None,
        "total_cases": 198,
        "data_source": "BLS_FATALITIES_A1_2023",
        "year": 2023
    },
    {
        "naics_code": "237",
        "industry_name": "Heavy and civil engineering construction",
        "injury_rate": None,
        "total_cases": 156,
        "data_source": "BLS_FATALITIES_A1_2023",
        "year": 2023
    },
    {
        "naics_code": "238",
        "industry_name": "Specialty trade contractors",
        "injury_rate": None,
        "total_cases": 715,
        "data_source": "BLS_FATALITIES_A1_2023",
        "year": 2023
    },
    {
        "naics_code": "23816",
        "industry_name": "Roofing contractors",
        "injury_rate": None,
        "total_cases": 96,
        "data_source": "BLS_FATALITIES_A1_2023",
        "year": 2023
    },
    {
        "naics_code": "23812",
        "industry_name": "Structural steel and precast concrete contractors",
        "injury_rate": None,
        "total_cases": 42,
        "data_source": "BLS_FATALITIES_A1_2023",
        "year": 2023
    }
]

# ============================================================
# V1 INDUSTRY BENCHMARK DATA
# Aggregated risk profiles for major industries
# ============================================================

INDUSTRY_BENCHMARKS = [
    {
        "naics_code": "23",
        "industry_name": "Construction",
        "avg_injury_rate": 25,  # Per 100 workers (historical average)
        "avg_fatality_rate": 107,  # Per 100,000 workers
        "risk_profile": {
            "primaryRisks": ["Falls", "Struck by object", "Electrocution", "Caught-in/between"],
            "seasonalFactors": ["Weather dependent", "Increased activity in spring/summer"],
            "equipmentRisks": ["Heavy machinery", "Power tools", "Scaffolding", "Ladders"]
        },
        "safety_recommendations": [
            "Implement comprehensive fall protection program",
            "Regular safety training and toolbox talks",
            "Personal protective equipment compliance",
            "Equipment inspection and maintenance protocols"
        ]
    },
    {
        "naics_code": "23816",
        "industry_name": "Roofing contractors",
        "avg_injury_rate": 47,  # Per 100 workers
        "avg_fatality_rate": 347,  # Per 100,000 workers
        "risk_profile": {
            "primaryRisks": ["Falls from elevation", "Heat stress", "Tool-related injuries"],
            "workEnvironment": ["Height work", "Weather exposure", "Steep surfaces"],
            "peakSeasons": ["Spring through fall"]
        },
        "safety_recommendations": [
            "OSHA-compliant fall protection systems",
            "Heat illness prevention program",
            "Weather monitoring and work stoppage protocols",
            "Specialized roofing safety training"
        ]
    }
]


async def run_migration(conn):
    """Create the knowledge base tables"""
    print("📦 Creating knowledge base tables...")
    
    # Drop and recreate to ensure proper constraints
    await conn.execute("DROP TABLE IF EXISTS osha_injury_rates CASCADE")
    await conn.execute("DROP TABLE IF EXISTS industry_benchmarks CASCADE")
    
    migration_sql = """
    -- Table 1: OSHA Injury Rates
    CREATE TABLE osha_injury_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        naics_code TEXT NOT NULL,
        industry_name TEXT NOT NULL,
        injury_rate DECIMAL(5,2),
        total_cases INTEGER,
        data_source TEXT NOT NULL,
        year INTEGER NOT NULL DEFAULT 2023,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        UNIQUE(naics_code, data_source, year)
    );

    CREATE INDEX idx_osha_injury_naics ON osha_injury_rates(naics_code);
    CREATE INDEX idx_osha_injury_source ON osha_injury_rates(data_source);
    CREATE INDEX idx_osha_injury_rate ON osha_injury_rates(injury_rate);

    -- Table 2: Industry Benchmarks
    CREATE TABLE industry_benchmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        naics_code TEXT NOT NULL UNIQUE,
        industry_name TEXT NOT NULL,
        avg_injury_rate INTEGER,
        avg_fatality_rate INTEGER,
        risk_profile JSONB,
        safety_recommendations JSONB,
        benchmark_date TIMESTAMPTZ DEFAULT now() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );

    CREATE INDEX idx_benchmark_naics ON industry_benchmarks(naics_code);
    CREATE INDEX idx_benchmark_injury_rate ON industry_benchmarks(avg_injury_rate);
    """
    
    await conn.execute(migration_sql)
    print("✅ Tables created successfully")


async def seed_osha_injury_rates(conn):
    """Seed BLS injury data (36 records)"""
    print(f"📊 Seeding {len(OSHA_INJURY_DATA)} OSHA injury rate records...")
    
    for record in OSHA_INJURY_DATA:
        await conn.execute("""
            INSERT INTO osha_injury_rates 
            (naics_code, industry_name, injury_rate, total_cases, data_source, year)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (naics_code, data_source, year) DO UPDATE SET
                industry_name = EXCLUDED.industry_name,
                injury_rate = EXCLUDED.injury_rate,
                total_cases = EXCLUDED.total_cases
        """, 
        record["naics_code"],
        record["industry_name"],
        record["injury_rate"],
        record["total_cases"],
        record["data_source"],
        record["year"])
    
    count = await conn.fetchval("SELECT COUNT(*) FROM osha_injury_rates")
    print(f"✅ Seeded {count} OSHA injury rate records")
    return count


async def seed_industry_benchmarks(conn):
    """Seed industry benchmark data (2 records)"""
    import json
    
    print(f"📈 Seeding {len(INDUSTRY_BENCHMARKS)} industry benchmarks...")
    
    for benchmark in INDUSTRY_BENCHMARKS:
        await conn.execute("""
            INSERT INTO industry_benchmarks
            (naics_code, industry_name, avg_injury_rate, avg_fatality_rate,
             risk_profile, safety_recommendations)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
            ON CONFLICT (naics_code) DO UPDATE SET
                industry_name = EXCLUDED.industry_name,
                avg_injury_rate = EXCLUDED.avg_injury_rate,
                avg_fatality_rate = EXCLUDED.avg_fatality_rate,
                risk_profile = EXCLUDED.risk_profile,
                safety_recommendations = EXCLUDED.safety_recommendations
        """,
        benchmark["naics_code"],
        benchmark["industry_name"],
        benchmark["avg_injury_rate"],
        benchmark["avg_fatality_rate"],
        json.dumps(benchmark["risk_profile"]),
        json.dumps(benchmark["safety_recommendations"]))
    
    count = await conn.fetchval("SELECT COUNT(*) FROM industry_benchmarks")
    print(f"✅ Seeded {count} industry benchmarks")
    return count


async def verify_data(conn):
    """Verify seeded data"""
    print("\n🔍 Verifying seeded data...")
    
    # Check counts
    osha_count = await conn.fetchval("SELECT COUNT(*) FROM osha_injury_rates")
    benchmark_count = await conn.fetchval("SELECT COUNT(*) FROM industry_benchmarks")
    
    print(f"   OSHA Injury Rates: {osha_count} records")
    print(f"   Industry Benchmarks: {benchmark_count} records")
    
    # Sample query: High-risk industries
    high_risk = await conn.fetch("""
        SELECT naics_code, industry_name, injury_rate
        FROM osha_injury_rates
        WHERE data_source = 'BLS_Table_1_2023'
        ORDER BY injury_rate DESC
        LIMIT 5
    """)
    
    print("\n📊 Top 5 Highest-Risk Construction Industries (2023):")
    for row in high_risk:
        print(f"   {row['naics_code']}: {row['industry_name']} - {row['injury_rate']} per 100 workers")
    
    # Glass and glazing specific
    glazing = await conn.fetchrow("""
        SELECT * FROM osha_injury_rates
        WHERE naics_code = '23815' AND data_source = 'BLS_Table_1_2023'
    """)
    
    if glazing:
        print(f"\n🔵 Glass & Glazing (NAICS 23815):")
        print(f"   Injury Rate: {glazing['injury_rate']} per 100 workers")
        print(f"   Total Cases: {glazing['total_cases']:,} in 2023")
    
    return osha_count, benchmark_count


async def main():
    """Main seeding function"""
    print("=" * 60)
    print("🌱 V1 Knowledge Base Seeder for Safety Companion V3")
    print("=" * 60)
    print(f"Database: {DATABASE_URL[:50]}...")
    print()
    
    # Connect to database
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Run migration
        await run_migration(conn)
        
        # Seed data
        osha_count = await seed_osha_injury_rates(conn)
        benchmark_count = await seed_industry_benchmarks(conn)
        
        # Verify
        await verify_data(conn)
        
        print("\n" + "=" * 60)
        print("✅ Knowledge base seeding complete!")
        print(f"   Total: {osha_count + benchmark_count} records")
        print("=" * 60)
        
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
