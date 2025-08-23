/*
  # User Presence System for Real-time Chat

  1. New Tables
    - `user_presence`
      - `user_id` (uuid, references auth.users)
      - `exchange_id` (text, references money_exchanges.unique_id)
      - `is_online` (boolean, user online status)
      - `last_seen` (timestamptz, last activity timestamp)
      - `is_typing` (boolean, typing indicator)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_presence` table
    - Add policies for authenticated users to:
      - View presence for exchanges they're involved in
      - Update their own presence status

  3. Indexes
    - Optimize query performance for presence operations
    - Support real-time presence updates
*/

-- Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exchange_id text NOT NULL,
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  is_typing boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Composite primary key
  PRIMARY KEY (user_id, exchange_id),
  
  -- Foreign key to money_exchanges using unique_id
  CONSTRAINT fk_presence_exchange
    FOREIGN KEY (exchange_id) 
    REFERENCES money_exchanges(unique_id) 
    ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_presence_exchange_id 
  ON user_presence(exchange_id);

CREATE INDEX IF NOT EXISTS idx_user_presence_online 
  ON user_presence(exchange_id, is_online) 
  WHERE is_online = true;

CREATE INDEX IF NOT EXISTS idx_user_presence_typing 
  ON user_presence(exchange_id, is_typing) 
  WHERE is_typing = true;

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen 
  ON user_presence(exchange_id, last_seen DESC);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view presence for exchanges they're involved in
CREATE POLICY "Users can view presence in their exchanges"
  ON user_presence
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own presence
    user_id = auth.uid() OR
    -- User can see presence in exchanges they own
    EXISTS (
      SELECT 1 FROM money_exchanges 
      WHERE unique_id = exchange_id 
      AND user_id = auth.uid()
    ) OR
    -- User can see presence in exchanges they're messaging in
    EXISTS (
      SELECT 1 FROM exchange_messages 
      WHERE exchange_id = user_presence.exchange_id 
      AND (sender_id = auth.uid() OR receiver_id = auth.uid())
    )
  );

-- Policy: Users can update their own presence
CREATE POLICY "Users can update their own presence"
  ON user_presence
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_user_presence_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_user_presence_updated_at ON user_presence;
CREATE TRIGGER trigger_update_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_user_presence_updated_at();

-- Function to clean up old presence records
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
  -- Mark users as offline if they haven't been seen in 5 minutes
  UPDATE user_presence 
  SET is_online = false, is_typing = false
  WHERE last_seen < now() - interval '5 minutes' 
  AND is_online = true;
  
  -- Delete very old presence records (older than 24 hours)
  DELETE FROM user_presence 
  WHERE last_seen < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create a view for active users in exchanges
CREATE OR REPLACE VIEW active_exchange_users AS
SELECT 
  exchange_id,
  COUNT(*) FILTER (WHERE is_online = true) as online_count,
  COUNT(*) FILTER (WHERE is_typing = true) as typing_count,
  array_agg(user_id) FILTER (WHERE is_online = true) as online_users,
  array_agg(user_id) FILTER (WHERE is_typing = true) as typing_users,
  MAX(last_seen) as last_activity
FROM user_presence
WHERE last_seen > now() - interval '5 minutes'
GROUP BY exchange_id;

-- Grant access to the view
GRANT SELECT ON active_exchange_users TO authenticated;

-- Schedule cleanup function (this would typically be done via pg_cron or similar)
-- For now, we'll create it as a function that can be called manually or via a scheduled job
COMMENT ON FUNCTION cleanup_old_presence() IS 'Call this function periodically to clean up old presence records';
