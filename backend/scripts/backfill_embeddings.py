"""
Backfill script: Generate embeddings for existing JHAs in analysis_history.

Run once after deploying embedding service to populate vector tables.
Subsequent JHAs will be embedded automatically on creation.
"""

import asyncio
import logging
import sys
import os
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.services.embedding_service import embedding_service
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmbeddingBackfill:
    """Backfill embeddings for historical JHAs."""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.batch_size = 10  # Process 10 JHAs at a time
    
    async def get_total_jhas(self) -> int:
        """Count JHAs without embeddings."""
        sql = text("""
            SELECT COUNT(*)
            FROM analysis_history ah
            WHERE NOT EXISTS (
                SELECT 1 FROM jha_embeddings je
                WHERE je.analysis_id = ah.id
            )
        """)
        result = await self.db.execute(sql)
        return result.scalar()
    
    async def fetch_jhas_batch(self, offset: int) -> list:
        """Fetch batch of JHAs needing embeddings."""
        sql = text("""
            SELECT 
                ah.id,
                ah.checklist_data,
                ah.created_at,
                ah.data_quality_score
            FROM analysis_history ah
            WHERE NOT EXISTS (
                SELECT 1 FROM jha_embeddings je
                WHERE je.analysis_id = ah.id
            )
            ORDER BY ah.created_at DESC
            LIMIT :limit OFFSET :offset
        """)
        
        result = await self.db.execute(
            sql,
            {"limit": self.batch_size, "offset": offset}
        )
        return result.fetchall()
    
    async def embed_jha(self, jha_row) -> bool:
        """
        Generate embedding for single JHA and insert into jha_embeddings table.
        
        Returns True if successful, False otherwise.
        """
        try:
            jha_id = jha_row.id
            checklist_data = jha_row.checklist_data
            
            # Extract key fields for embedding
            job_info = checklist_data.get("jobInfo", {})
            hazards = checklist_data.get("hazards", [])
            controls = checklist_data.get("controls", [])
            
            # Create searchable text
            text_parts = []
            
            if desc := job_info.get("jobDescription"):
                text_parts.append(f"Job: {desc}")
            if work_type := job_info.get("workType"):
                text_parts.append(f"Work Type: {work_type}")
            if equipment := job_info.get("equipment"):
                text_parts.append(f"Equipment: {equipment}")
            
            if hazards:
                hazard_descs = [h.get("description", "") for h in hazards]
                text_parts.append(f"Hazards: {'; '.join(hazard_descs)}")
            
            if controls:
                control_descs = [c.get("description", "") for c in controls]
                text_parts.append(f"Controls: {'; '.join(control_descs)}")
            
            searchable_text = " | ".join(text_parts)
            
            # Generate embedding
            embedding = embedding_service.encode_text(searchable_text)
            
            # Extract metadata for filtering
            hazard_category = None
            if hazards:
                # Use first hazard type as category
                hazard_category = hazards[0].get("type", "Unknown")
            
            equipment_type = job_info.get("equipment", "Unknown")
            work_type = job_info.get("workType", "Unknown")
            
            # Calculate risk score (average of hazard probabilities)
            risk_score = None
            if hazards:
                probabilities = [h.get("probability", 0) for h in hazards]
                risk_score = sum(probabilities) / len(probabilities) if probabilities else 0
            
            # Insert into jha_embeddings
            insert_sql = text("""
                INSERT INTO jha_embeddings (
                    analysis_id,
                    embedding,
                    content_type,
                    hazard_category,
                    equipment_type,
                    work_type,
                    risk_score,
                    metadata,
                    created_at
                )
                VALUES (
                    :analysis_id,
                    :embedding::vector,
                    'jha_analysis',
                    :hazard_category,
                    :equipment_type,
                    :work_type,
                    :risk_score,
                    :metadata::jsonb,
                    :created_at
                )
            """)
            
            await self.db.execute(
                insert_sql,
                {
                    "analysis_id": jha_id,
                    "embedding": str(embedding),
                    "hazard_category": hazard_category,
                    "equipment_type": equipment_type,
                    "work_type": work_type,
                    "risk_score": risk_score,
                    "metadata": {
                        "data_quality_score": jha_row.data_quality_score,
                        "num_hazards": len(hazards),
                        "num_controls": len(controls)
                    },
                    "created_at": jha_row.created_at
                }
            )
            
            logger.info(f"✓ Embedded JHA {jha_id} ({hazard_category}, {work_type})")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to embed JHA {jha_row.id}: {e}")
            return False
    
    async def run(self):
        """Execute backfill process."""
        logger.info("=" * 60)
        logger.info("EMBEDDING BACKFILL STARTING")
        logger.info("=" * 60)
        
        # Count total
        total = await self.get_total_jhas()
        logger.info(f"Total JHAs needing embeddings: {total}")
        
        if total == 0:
            logger.info("No JHAs to process. Exiting.")
            return
        
        # Process in batches
        processed = 0
        errors = 0
        offset = 0
        
        while processed < total:
            logger.info(f"\n--- Batch {offset // self.batch_size + 1} ---")
            
            # Fetch batch
            batch = await self.fetch_jhas_batch(offset)
            if not batch:
                break
            
            # Process each JHA
            for jha_row in batch:
                success = await self.embed_jha(jha_row)
                if success:
                    processed += 1
                else:
                    errors += 1
            
            # Commit batch
            await self.db.commit()
            
            # Progress
            logger.info(f"Progress: {processed}/{total} ({100 * processed / total:.1f}%)")
            
            offset += self.batch_size
        
        logger.info("\n" + "=" * 60)
        logger.info("BACKFILL COMPLETE")
        logger.info(f"Successfully embedded: {processed}")
        logger.info(f"Errors: {errors}")
        logger.info("=" * 60)


async def main():
    """Entry point."""
    # Create async engine
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True
    )
    
    # Create session
    AsyncSessionLocal = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with AsyncSessionLocal() as session:
        backfill = EmbeddingBackfill(session)
        await backfill.run()
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
