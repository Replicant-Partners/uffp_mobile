-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,

  -- Profile fields
  bio TEXT,
  specialization_tags TEXT[], -- e.g., ['technology', 'economics', 'sports']

  -- Settings
  default_distribution VARCHAR(50) DEFAULT 'normal',
  notification_preferences JSONB DEFAULT '{"email": true, "forecast_resolved": true, "new_comments": false}'::jsonb,
  coach_personality VARCHAR(50) DEFAULT 'balanced' -- 'encouraging', 'challenging', 'balanced'
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add user_id column to forecasts table
ALTER TABLE forecasts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add privacy level to forecasts
ALTER TABLE forecasts
  ADD COLUMN IF NOT EXISTS privacy VARCHAR(20) DEFAULT 'private' CHECK (privacy IN ('private', 'unlisted', 'public', 'organization'));

-- Add discoverable flag
ALTER TABLE forecasts
  ADD COLUMN IF NOT EXISTS discoverable BOOLEAN DEFAULT false;

-- Add tags for discovery
ALTER TABLE forecasts
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create index for discovery queries
CREATE INDEX IF NOT EXISTS idx_forecasts_discoverable ON forecasts(discoverable, privacy) WHERE discoverable = true;
CREATE INDEX IF NOT EXISTS idx_forecasts_user_id ON forecasts(user_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_tags ON forecasts USING GIN(tags);

-- Migrate existing anonymous users
-- Convert anonymous-user-* IDs to actual user records
DO $$
DECLARE
  anon_user_id TEXT;
  new_user_uuid UUID;
BEGIN
  FOR anon_user_id IN
    SELECT DISTINCT user_id FROM forecasts WHERE user_id LIKE 'anonymous-user-%'
  LOOP
    -- Create a user for each anonymous ID
    INSERT INTO users (id, email, password_hash, password_salt, name)
    VALUES (
      gen_random_uuid(),
      anon_user_id || '@anonymous.uffp',
      '', -- No password for migrated anonymous users
      '',
      'Anonymous User'
    )
    RETURNING id INTO new_user_uuid;

    -- Update forecasts to use the new UUID
    UPDATE forecasts SET user_id = new_user_uuid::TEXT WHERE user_id = anon_user_id;
  END LOOP;
END $$;

COMMENT ON TABLE users IS 'User accounts for authentication and profiles';
COMMENT ON COLUMN forecasts.privacy IS 'private: only user, unlisted: link sharing, public: discoverable, organization: team only';
COMMENT ON COLUMN forecasts.discoverable IS 'Whether forecast appears in public feeds';
