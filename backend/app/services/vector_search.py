"""
Vector Search Service - Semantic search over historical JHAs and incidents.
Integrates with pgvector database for pattern matching.

NOTE: All queries are wrapped with error handling + session rollback
so that missing tables (jha_embeddings, incident_embeddings, osha_embeddings)
don't poison the shared DB session used by the orchestrator pipeline.
"""

import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)


class VectorSearchService:
    """
    Semantic search over JHA history using pgvector + HNSW indexing.

    Tables:
    - jha_embeddings: All past JHA analyses
    - incident_embeddings: Historical incidents with Swiss Cheese chains
    - osha_embeddings: Regulatory knowledge base
    """

    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def _safe_execute(self, sql, params: dict):
        """
        Execute a query safely — if it fails (e.g. table doesn't exist),
        rollback the session so it stays usable for other operations.
        Returns the result rows, or None on failure.
        """
        try:
            result = await self.db.execute(sql, params)
            return result
        except Exception as e:
            logger.warning(f"Vector search query failed: {e}")
            try:
                await self.db.rollback()
            except Exception:
                pass
            return None

    async def search_similar_jhas(
        self,
        query: str,
        hazard_category: Optional[str] = None,
        equipment_type: Optional[str] = None,
        work_type: Optional[str] = None,
        limit: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Find similar historical JHAs using semantic search.
        """
        query_embedding = embedding_service.encode_text(query)

        filters = []
        if hazard_category:
            filters.append(f"hazard_category = '{hazard_category}'")
        if equipment_type:
            filters.append(f"equipment_type = '{equipment_type}'")
        if work_type:
            filters.append(f"work_type = '{work_type}'")

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        sql = text(f"""
            SELECT
                je.analysis_id,
                je.content_type,
                je.hazard_category,
                je.equipment_type,
                je.work_type,
                je.risk_score,
                je.incident_probability,
                je.metadata,
                1 - (je.embedding <=> :query_embedding::vector) AS similarity
            FROM jha_embeddings je
            {where_clause}
            ORDER BY je.embedding <=> :query_embedding::vector
            LIMIT :limit
        """)

        result = await self._safe_execute(
            sql,
            {
                "query_embedding": str(query_embedding),
                "limit": limit
            }
        )

        if result is None:
            return []

        matches = []
        for row in result:
            if row.similarity >= similarity_threshold:
                matches.append({
                    "analysis_id": row.analysis_id,
                    "content_type": row.content_type,
                    "hazard_category": row.hazard_category,
                    "equipment_type": row.equipment_type,
                    "work_type": row.work_type,
                    "risk_score": float(row.risk_score) if row.risk_score else None,
                    "incident_probability": float(row.incident_probability) if row.incident_probability else None,
                    "metadata": row.metadata,
                    "similarity": float(row.similarity)
                })

        logger.info(f"Found {len(matches)} similar JHAs (threshold: {similarity_threshold})")
        return matches

    async def search_similar_incidents(
        self,
        query: str,
        hazard_category: Optional[str] = None,
        equipment_type: Optional[str] = None,
        work_type: Optional[str] = None,
        incident_type: Optional[str] = None,
        limit: int = 5,
        similarity_threshold: float = 0.75
    ) -> List[Dict[str, Any]]:
        """
        Find similar historical incidents for pattern matching.
        Critical for Agent 3: Provides Bayesian priors from real incident data.
        """
        query_embedding = embedding_service.encode_text(query)

        filters = []
        if hazard_category:
            filters.append(f"hazard_category = '{hazard_category}'")
        if equipment_type:
            filters.append(f"equipment_type = '{equipment_type}'")
        if work_type:
            filters.append(f"work_type = '{work_type}'")
        if incident_type:
            filters.append(f"incident_type = '{incident_type}'")

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        sql = text(f"""
            SELECT
                ie.analysis_id,
                ie.incident_type,
                ie.description,
                ie.swiss_cheese_chain,
                ie.actual_outcome,
                ie.time_to_incident,
                ie.hazard_category,
                ie.equipment_type,
                ie.work_type,
                ie.metadata,
                1 - (ie.embedding <=> :query_embedding::vector) AS similarity
            FROM incident_embeddings ie
            {where_clause}
            ORDER BY ie.embedding <=> :query_embedding::vector
            LIMIT :limit
        """)

        result = await self._safe_execute(
            sql,
            {
                "query_embedding": str(query_embedding),
                "limit": limit
            }
        )

        if result is None:
            return []

        matches = []
        for row in result:
            if row.similarity >= similarity_threshold:
                matches.append({
                    "analysis_id": row.analysis_id,
                    "incident_type": row.incident_type,
                    "description": row.description,
                    "swiss_cheese_chain": row.swiss_cheese_chain,
                    "actual_outcome": row.actual_outcome,
                    "time_to_incident": str(row.time_to_incident) if row.time_to_incident else None,
                    "hazard_category": row.hazard_category,
                    "equipment_type": row.equipment_type,
                    "work_type": row.work_type,
                    "metadata": row.metadata,
                    "similarity": float(row.similarity)
                })

        logger.info(f"Found {len(matches)} similar incidents (threshold: {similarity_threshold})")
        return matches

    async def search_osha_regulations(
        self,
        query: str,
        industry_applicability: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search OSHA regulations relevant to current hazard.
        """
        query_embedding = embedding_service.encode_text(query)

        industry_filter = f"WHERE '{industry_applicability}' = ANY(industry_applicability)" if industry_applicability else ""

        sql = text(f"""
            SELECT
                oe.citation_number,
                oe.regulation_title,
                oe.description,
                oe.industry_applicability,
                oe.hazard_categories,
                oe.metadata,
                1 - (oe.embedding <=> :query_embedding::vector) AS similarity
            FROM osha_embeddings oe
            {industry_filter}
            ORDER BY oe.embedding <=> :query_embedding::vector
            LIMIT :limit
        """)

        result = await self._safe_execute(
            sql,
            {
                "query_embedding": str(query_embedding),
                "limit": limit
            }
        )

        if result is None:
            return []

        matches = []
        for row in result:
            matches.append({
                "citation_number": row.citation_number,
                "regulation_title": row.regulation_title,
                "description": row.description,
                "industry_applicability": row.industry_applicability,
                "hazard_categories": row.hazard_categories,
                "metadata": row.metadata,
                "similarity": float(row.similarity)
            })

        logger.info(f"Found {len(matches)} relevant OSHA regulations")
        return matches

    async def get_incident_base_rate(
        self,
        hazard_category: str,
        equipment_type: Optional[str] = None,
        work_type: Optional[str] = None
    ) -> Dict[str, float]:
        """
        Calculate historical incident rate for Bayesian priors.
        Critical for Agent 3: Replaces industry averages with actual data.
        """
        filters = [f"hazard_category = '{hazard_category}'"]
        if equipment_type:
            filters.append(f"equipment_type = '{equipment_type}'")
        if work_type:
            filters.append(f"work_type = '{work_type}'")

        where_clause = " AND ".join(filters)

        total_sql = text(f"""
            SELECT COUNT(*) as total
            FROM jha_embeddings
            WHERE {where_clause}
        """)

        incident_sql = text(f"""
            SELECT COUNT(*) as incidents
            FROM incident_embeddings
            WHERE {where_clause}
        """)

        total_result = await self._safe_execute(total_sql, {})
        if total_result is None:
            return {
                "incident_rate": 2.9,
                "sample_size": 0,
                "confidence": "LOW"
            }

        incident_result = await self._safe_execute(incident_sql, {})
        if incident_result is None:
            return {
                "incident_rate": 2.9,
                "sample_size": 0,
                "confidence": "LOW"
            }

        total = total_result.scalar()
        incidents = incident_result.scalar()

        if total == 0:
            return {
                "incident_rate": 2.9,
                "sample_size": 0,
                "confidence": "LOW"
            }

        rate = (incidents / total) * 100

        if total >= 50:
            confidence = "HIGH"
        elif total >= 20:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        return {
            "incident_rate": round(rate, 2),
            "sample_size": total,
            "confidence": confidence
        }


# Dependency injection for FastAPI routes
async def get_vector_search(db: AsyncSession) -> VectorSearchService:
    """Provide VectorSearchService to route handlers."""
    return VectorSearchService(db)
