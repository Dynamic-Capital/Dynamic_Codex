/*
  Create ocr_jobs table for OCR processing queue
*/

-- BEGIN OCR_JOBS_TABLE
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id serial PRIMARY KEY,
  file_hash text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error')),
  retries integer NOT NULL DEFAULT 0,
  vendor text NOT NULL
);

ALTER TABLE ocr_jobs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage ocr_jobs"
  ON ocr_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- END OCR_JOBS_TABLE
