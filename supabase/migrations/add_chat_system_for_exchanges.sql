/*
  # Chat System for Money Exchange Requests

  1. Database Schema
    - Ensure channels table exists for chat rooms
    - Ensure messages table exists for chat messages
    - Ensure channel_memberships table exists for user access
    - Add indexes for optimal performance

  2. Chat Channel Management
    - Create channels for each exchange request
    - Manage user memberships in channels
    - Support real-time messaging

  3. Security
    - Enable RLS on all chat tables
    - Add policies for authenticated users
    - Ensure users can only access their own chats
*/

-- Create channels table if it doesn't exist
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_group boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create channel_memberships table if it doesn't exist
CREATE TABLE IF NOT EXISTS channel_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Enable RLS on all chat tables
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_memberships ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON channels(created_by);

CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_channel_memberships_channel_id ON channel_memberships(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_memberships_user_id ON channel_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_memberships_unique ON channel_memberships(channel_id, user_id);

-- RLS Policies for channels
CREATE POLICY "Users can view channels they are members of"
  ON channels
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT channel_id 
      FROM channel_memberships 
      WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create channels"
  ON channels
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Channel creators can update their channels"
  ON channels
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their channels"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    channel_id IN (
      SELECT channel_id 
      FROM channel_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their channels"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    channel_id IN (
      SELECT channel_id 
      FROM channel_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for channel_memberships
CREATE POLICY "Users can view their own memberships"
  ON channel_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can join channels"
  ON channel_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave channels"
  ON channel_memberships
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating updated_at
DROP TRIGGER IF EXISTS trigger_update_channels_updated_at ON channels;
CREATE TRIGGER trigger_update_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_messages_updated_at ON messages;
CREATE TRIGGER trigger_update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
