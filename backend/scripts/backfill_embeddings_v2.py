"""
Backfill script: Generate embeddings for existing JHAs in analysis_history.

CORRECTED VERSION: Works with actual analysis_history schema where JHA data
is stored in metadata->checklist_data JSON field.

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
            WHERE ah.type = 'jha_multi_agent_analysis'
            AND NOT EXISTS (
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
                ah.metadata,
                ah.created_at,
                ah.risk_score
            FROM analysis_history ah
            WHERE ah.type = 'jha_multi_agent_analysis'
            AND NOT EXISTS (
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
            metadata = jha_row.metadata
            
            # Extract checklist_data from metadata
            checklist_data = metadata.get("checklist_data", {})
            if not checklist_data:
                logger.warning(f"⚠ JHA {jha_id} has no checklist_data, skipping")
                return False
            
            # Extract key fields for embedding
            job_info = checklist_data.get("jobInfo", {})
            hazards = checklist_data.get("hazards", [])
            control_measures = checklist_data.get("controlMeasures", {})
            
            # Create searchable text
            text_parts = []
            
            if desc := job_info.get("projectName"):
                text_parts.append(f"Project: {desc}")
            if work_type := job_info.get("workType"):
                text_parts.append(f"Work Type: {work_type}")
            if location := job_info.get("location"):
                text_parts.append(f"Location: {location}")
            
            if hazards:
                # Concatenate all hazard descriptions
                hazard_texts = []
                for h in hazards:
                    if desc := h.get("description"):
                        hazard_texts.append(desc[:500])  # Limit length
                if hazard_texts:
                    text_parts.append(f"Hazards: {' | '.join(hazard_texts)}")
            
            # Add control measures
            if ppe := control_measures.get("ppe"):
                if isinstance(ppe, list) and ppe:
                    text_parts.append(f"PPE: {'; '.join(ppe[:3])}")  # First 3 items
            
            if procedures := control_measures.get("procedures"):
                if isinstance(procedures, list) and procedures:
                    text_parts.append(f"Procedures: {'; '.join(procedures[:2])}")  # First 2
            
            searchable_text = " | ".join(text_parts)
            
            # Generate embedding
            embedding = embedding_service.encode_text(searchable_text)
            
            # Extract metadata for filtering
            hazard_category = None
            if hazards and len(hazards) > 0:
                # Use first hazard category
                hazard_category = hazards[0].get("category", "Unknown")
            
            work_type = job_info.get("workType", "Unknown")
            equipment_type = "Unknown"  # Not in schema
            
            # Calculate risk score (use existing risk_score if available)
            risk_score = jha_row.risk_score
            if not risk_score and hazards:
                # Fallback: count high-severity hazards
                high_severity = sum(1 for h in hazards if h.get("severity") == "high")
                risk_score = min(high_severity * 3, 10)  # Scale to 0-10
            
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
                        "project_name": job_info.get("projectName"),
                        "location": job_info.get("location"),
                        "crew_size": job_info.get("crewSize"),
                        "num_hazards": len(hazards),
                        "supervisor": job_info.get("supervisor")
                    },
                    "created_at": jha_row.created_at
                }
            )
            
            logger.info(f"✓ Embedded JHA {jha_id[:8]}... ({hazard_category}, {work_type})")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to embed JHA {jha_row.id}: {e}")
            import traceback
            logger.error(traceback.format_exc())
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
