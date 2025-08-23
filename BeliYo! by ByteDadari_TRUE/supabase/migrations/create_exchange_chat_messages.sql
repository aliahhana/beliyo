/*
  # Exchange-specific Chat Messages System

  1. New Tables
    - `exchange_messages`
      - `id` (uuid, primary key)
      - `exchange_request_id` (text, references money_exchanges.unique_id)
      - `sender_id` (uuid, references auth.users)
      - `receiver_id` (uuid, references auth.users)
      - `content` (text, message content)
      - `read_at` (timestamptz, when message was read)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `exchange_messages` table
    - Add policies for authenticated users to:
      - View messages for their own exchange requests
      - Send messages in exchanges they're involved in
      - Mark messages as read

  3. Indexes
    - Optimize query performance for chat operations
*/

-- Create exchange_messages table
CREATE TABLE IF NOT EXISTS exchange_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_request_id text NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Add foreign key to money_exchanges using unique_id
  CONSTRAINT fk_exchange_request
    FOREIGN KEY (exchange_request_id) 
    REFERENCES money_exchanges(unique_id) 
    ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchange_messages_request_id 
  ON exchange_messages(exchange_request_id);

CREATE INDEX IF NOT EXISTS idx_exchange_messages_sender 
  ON exchange_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_exchange_messages_receiver 
  ON exchange_messages(receiver_id);

CREATE INDEX IF NOT EXISTS idx_exchange_messages_created 
  ON exchange_messages(exchange_request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_messages_participants 
  ON exchange_messages(sender_id, receiver_id);

-- Enable RLS
ALTER TABLE exchange_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view messages where they are sender or receiver
CREATE POLICY "Users can view their exchange messages"
  ON exchange_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id OR
    -- Also allow if user owns the exchange request
    EXISTS (
      SELECT 1 FROM money_exchanges 
      WHERE unique_id = exchange_request_id 
      AND user_id = auth.uid()
    )
  );

-- Policy: Users can send messages in exchanges they're involved in
CREATE POLICY "Users can send messages in their exchanges"
  ON exchange_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Sender must be the authenticated user
    sender_id = auth.uid() AND
    -- Must be involved in the exchange (either owner or responding to owner)
    (
      -- User owns the exchange request
      EXISTS (
        SELECT 1 FROM money_exchanges 
        WHERE unique_id = exchange_request_id 
        AND user_id = auth.uid()
      ) OR
      -- User is responding to an exchange request
      EXISTS (
        SELECT 1 FROM money_exchanges 
        WHERE unique_id = exchange_request_id 
        AND user_id = receiver_id
      )
    )
  );

-- Policy: Users can update their own messages (for read receipts)
CREATE POLICY "Users can mark messages as read"
  ON exchange_messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_exchange_messages_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_exchange_messages_updated_at ON exchange_messages;
CREATE TRIGGER trigger_update_exchange_messages_updated_at
  BEFORE UPDATE ON exchange_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_exchange_messages_updated_at();

-- Create a view for unread message counts
CREATE OR REPLACE VIEW exchange_message_counts AS
SELECT 
  exchange_request_id,
  receiver_id,
  COUNT(*) FILTER (WHERE read_at IS NULL) as unread_count,
  COUNT(*) as total_count,
  MAX(created_at) as last_message_at
FROM exchange_messages
GROUP BY exchange_request_id, receiver_id;

-- Grant access to the view
GRANT SELECT ON exchange_message_counts TO authenticated;
