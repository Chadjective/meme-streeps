-- ═══════════════════════════════════════════
-- Meme Streeps — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════

-- ── Votes Table ──
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id text NOT NULL,
  vote text NOT NULL CHECK (vote IN ('streets_ahead', 'for_the_streets')),
  device_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- One vote per device per quote
ALTER TABLE votes
  ADD CONSTRAINT votes_unique_device_quote UNIQUE (quote_id, device_id);

-- Index for leaderboard aggregation
CREATE INDEX IF NOT EXISTS idx_votes_quote_id ON votes (quote_id);

-- ── Row Level Security ──
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a vote (anon key)
CREATE POLICY "Anyone can vote"
  ON votes FOR INSERT
  TO anon
  WITH CHECK (true);

-- Anyone can read votes (for leaderboard)
CREATE POLICY "Anyone can read votes"
  ON votes FOR SELECT
  TO anon
  USING (true);

-- No updates or deletes allowed
-- (no policies = denied by default with RLS enabled)

-- ── Leaderboard View ──
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  quote_id,
  COUNT(*) FILTER (WHERE vote = 'streets_ahead') AS streets_ahead_count,
  COUNT(*) FILTER (WHERE vote = 'for_the_streets') AS for_the_streets_count,
  COUNT(*) AS total_votes,
  ROUND(
    COUNT(*) FILTER (WHERE vote = 'streets_ahead')::numeric / NULLIF(COUNT(*), 0) * 100
  ) AS approval_rate
FROM votes
GROUP BY quote_id
ORDER BY approval_rate DESC, total_votes DESC;
