-- BEGIN OCRCACHE
/*
  Create ocr_cache table for storing OCR results
*/

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ocr_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash text UNIQUE NOT NULL,
  vendor text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ocr_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON ocr_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin users can read ocr_cache" ON ocr_cache
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
-- END OCRCACHE
