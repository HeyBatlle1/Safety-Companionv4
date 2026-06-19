-- Migration: Update vector dimensions from 384 to 768 for Gemini embeddings
-- Date: 2026-02-08
-- Reason: Switched from Sentence-Transformers (384-dim) to Google Gemini (768-dim)

-- Update jha_embeddings table
ALTER TABLE jha_embeddings ALTER COLUMN embedding TYPE vector(768);

-- Update osha_embeddings table  
ALTER TABLE osha_embeddings ALTER COLUMN embedding TYPE vector(768);

-- Update incident_embeddings table
ALTER TABLE incident_embeddings ALTER COLUMN embedding TYPE vector(768);

-- Verify changes
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('jha_embeddings', 'osha_embeddings', 'incident_embeddings')
AND column_name = 'embedding';