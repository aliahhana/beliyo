/*
  # Fix Exchange Messages Foreign Key Constraint

  1. Changes
    - Drop the existing foreign key constraint that references unique_id
    - Add a new column exchange_id that can reference either unique_id or id
    - Update RLS policies to use the new column
    - Migrate existing data if any

  2. Security
    - Maintain all existing RLS policies
    - Ensure backward compatibility
*/

-- First, check if exchange_id column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exchange_messages' AND column_name = 'exchange_id'
  ) THEN
    -- Add new exchange_id column that's more flexible
    ALTER TABLE exchange_messages ADD COLUMN exchange_id text;
    
    -- Copy data from exchange_request_id to exchange_id if any exists
    UPDATE exchange_messages SET exchange_id = exchange_request_id WHERE exchange_id IS NULL;
    
    -- Make exchange_id NOT NULL after data migration
    ALTER TABLE exchange_messages ALTER COLUMN exchange_id SET NOT NULL;
  END IF;
END $$;

-- Drop the old foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_exchange_request' AND table_name = 'exchange_messages'
  ) THEN
    ALTER TABLE exchange_messages DROP CONSTRAINT fk_exchange_request;
  END IF;
END $$;

-- Create indexes for the new column if they don't exist
CREATE INDEX IF NOT EXISTS idx_exchange_messages_exchange_id 
  ON exchange_messages(exchange_id);

-- Update RLS policies to use exchange_id
DROP POLICY IF EXISTS "Users can view their exchange messages" ON exchange_messages;
CREATE POLICY "Users can view their exchange messages"
  ON exchange_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id OR
    -- Also allow if user owns the exchange request (check both unique_id and id)
    EXISTS (
      SELECT 1 FROM money_exchanges 
      WHERE (unique_id = exchange_id OR id::text = exchange_id)
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their exchanges" ON exchange_messages;
CREATE POLICY "Users can send messages in their exchanges"
  ON exchange_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Sender must be the authenticated user
    sender_id = auth.uid() AND
    -- Must be involved in the exchange (either owner or participant)
    (
      -- User owns the exchange request
      EXISTS (
        SELECT 1 FROM money_exchanges 
        WHERE (unique_id = exchange_id OR id::text = exchange_id)
        AND user_id = auth.uid()
      ) OR
      -- User has already participated in this exchange chat
      EXISTS (
        SELECT 1 FROM exchange_messages existing
        WHERE existing.exchange_id = exchange_id
        AND (existing.sender_id = auth.uid() OR existing.receiver_id = auth.uid())
      ) OR
      -- User is the intended receiver (for first response to an exchange)
      receiver_id = auth.uid()
    )
  );

-- Keep the update policy as is
DROP POLICY IF EXISTS "Users can mark messages as read" ON exchange_messages;
CREATE POLICY "Users can mark messages as read"
  ON exchange_messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Drop the old column if migration is complete
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exchange_messages' 
    AND column_name = 'exchange_request_id'
    AND column_name != 'exchange_id'
  ) THEN
    ALTER TABLE exchange_messages DROP COLUMN IF EXISTS exchange_request_id;
  END IF;
END $$;
