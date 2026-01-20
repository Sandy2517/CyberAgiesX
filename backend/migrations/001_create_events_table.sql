-- Create events table for canonical event storage
-- Migration: 001_create_events_table.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL, -- 'twilio', 'gmail', 'zoom', etc.
    source_id TEXT NOT NULL, -- Provider's unique ID for this event
    tenant_id TEXT NOT NULL DEFAULT 'default',
    event_type TEXT NOT NULL CHECK (event_type IN ('email', 'call', 'video', 'scan', 'chat')),
    timestamp TIMESTAMPTZ NOT NULL,
    sender TEXT, -- Anonymized display string
    recipients TEXT[] DEFAULT '{}', -- Array of anonymized recipients
    subject TEXT,
    body_preview TEXT,
    attachment_keys TEXT[] DEFAULT '{}', -- Object store keys for attachments
    recording_key TEXT, -- Object store key for call/video recordings
    transcript TEXT,
    embeddings_id TEXT,
    stylistic_score REAL,
    behavior_score REAL,
    trust_score REAL DEFAULT 50.0,
    tags TEXT[] DEFAULT '{}',
    actions JSONB DEFAULT '[]'::jsonb, -- Array of analyst actions
    provenance JSONB NOT NULL DEFAULT '{}'::jsonb, -- Raw provider payload
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for common queries
    CONSTRAINT unique_source_source_id UNIQUE (source, source_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_trust_score ON events(trust_score);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_events_provenance ON events USING GIN (provenance);
CREATE INDEX IF NOT EXISTS idx_events_actions ON events USING GIN (actions);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE events IS 'Canonical event storage with provenance tracking';
COMMENT ON COLUMN events.provenance IS 'Raw provider payload stored as JSONB';
COMMENT ON COLUMN events.actions IS 'Array of analyst actions: [{actor, action, at}]';

