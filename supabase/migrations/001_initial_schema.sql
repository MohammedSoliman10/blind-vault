-- Supabase Postgres Migration 001: Initial Schema
-- Feature: 001-tier1-core-arena
-- Creates scraped_signals (15-min cache) and arena_events (Realtime telemetry)

-- 1. Table: scraped_signals
CREATE TABLE IF NOT EXISTS scraped_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  url_hash TEXT NOT NULL UNIQUE, -- SHA-256 of normalized URL
  title TEXT,
  extracted_markdown TEXT NOT NULL,
  catalyst_score SMALLINT NOT NULL CHECK (catalyst_score >= 0 AND catalyst_score <= 100),
  signal_hash CHAR(64) NOT NULL, -- SHA-256 of score + article content
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_scraped_signals_hash ON scraped_signals(url_hash);
CREATE INDEX IF NOT EXISTS idx_scraped_signals_expires ON scraped_signals(expires_at);

-- 2. Table: arena_events
CREATE TABLE IF NOT EXISTS arena_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, -- 'ATTACK_PEEK', 'ATTACK_WITHDRAW', 'ATTACK_OVERSIZED', 'ATTACK_DRAWDOWN', 'TRADE_EXECUTED', 'DEPOSIT', 'EMERGENCY_EXIT'
  status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'BLOCKED'
  actor_pubkey VARCHAR(44) NOT NULL,
  vault_pubkey VARCHAR(44) NOT NULL,
  tx_signature VARCHAR(88), -- null if blocked by enclave ACL before tx emit
  error_code VARCHAR(50), -- e.g., 'ConstraintHasOne', 'ExceedsMaxPositionCap', 'AclAccessDenied'
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_events_vault ON arena_events(vault_pubkey, created_at DESC);

-- 3. Enable Supabase Realtime publication on arena_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'arena_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE arena_events;
  END IF;
END $$;

-- 4. Enable Row Level Security (RLS) & public read access for live Proof Tape
ALTER TABLE scraped_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'arena_events' AND policyname = 'Public read arena_events'
  ) THEN
    CREATE POLICY "Public read arena_events"
      ON arena_events
      FOR SELECT
      USING (true);
  END IF;
END $$;