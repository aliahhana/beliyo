/*
  # Add Unique Identifier System for Money Exchange Requests

  1. Schema Updates
    - Add `unique_id` column to `money_exchanges` table
    - Add `location` column for consistency with products
    - Create unique index on `unique_id` for performance
    - Add constraints for data integrity

  2. ID Generation System
    - Use format: `ME-{timestamp}-{random}` (ME = Money Exchange)
    - Ensures uniqueness and readability
    - Consistent with system conventions

  3. Performance Optimizations
    - Add indexes for optimal query performance
    - Ensure proper constraints for data integrity

  4. Data Consistency
    - Add updated_at trigger for automatic timestamp updates
    - Ensure all existing records get unique IDs
*/

-- Add unique_id column to money_exchanges table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'money_exchanges' AND column_name = 'unique_id'
  ) THEN
    ALTER TABLE money_exchanges ADD COLUMN unique_id text UNIQUE;
  END IF;
END $$;

-- Add location column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'money_exchanges' AND column_name = 'location'
  ) THEN
    ALTER TABLE money_exchanges ADD COLUMN location text DEFAULT 'SKKU';
  END IF;
END $$;

-- Create unique index on unique_id for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_money_exchanges_unique_id 
ON money_exchanges(unique_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_money_exchanges_status 
ON money_exchanges(status);

-- Create index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_money_exchanges_user_id 
ON money_exchanges(user_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_money_exchanges_status_created 
ON money_exchanges(status, created_at DESC);

-- Function to generate unique ID for money exchanges
CREATE OR REPLACE FUNCTION generate_money_exchange_id()
RETURNS text AS $$
DECLARE
  timestamp_part text;
  random_part text;
  unique_id text;
  collision_count int := 0;
BEGIN
  LOOP
    -- Generate timestamp part (YYYYMMDDHHMMSS)
    timestamp_part := to_char(now(), 'YYYYMMDDHH24MISS');
    
    -- Generate random part (6 characters)
    random_part := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    
    -- Combine parts with ME prefix
    unique_id := 'ME-' || timestamp_part || '-' || random_part;
    
    -- Check if ID already exists
    IF NOT EXISTS (SELECT 1 FROM money_exchanges WHERE unique_id = unique_id) THEN
      RETURN unique_id;
    END IF;
    
    -- Increment collision counter and add to random part if collision occurs
    collision_count := collision_count + 1;
    IF collision_count > 10 THEN
      -- If too many collisions, add extra randomness
      random_part := upper(substring(md5(random()::text || clock_timestamp()::text || collision_count::text) from 1 for 8));
      unique_id := 'ME-' || timestamp_part || '-' || random_part;
      RETURN unique_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate unique_id on insert
CREATE OR REPLACE FUNCTION set_money_exchange_unique_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.unique_id IS NULL OR NEW.unique_id = '' THEN
    NEW.unique_id := generate_money_exchange_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating unique_id
DROP TRIGGER IF EXISTS trigger_set_money_exchange_unique_id ON money_exchanges;
CREATE TRIGGER trigger_set_money_exchange_unique_id
  BEFORE INSERT ON money_exchanges
  FOR EACH ROW
  EXECUTE FUNCTION set_money_exchange_unique_id();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS trigger_update_money_exchanges_updated_at ON money_exchanges;
CREATE TRIGGER trigger_update_money_exchanges_updated_at
  BEFORE UPDATE ON money_exchanges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update existing records to have unique IDs
UPDATE money_exchanges 
SET unique_id = generate_money_exchange_id() 
WHERE unique_id IS NULL OR unique_id = '';

-- Add NOT NULL constraint after updating existing records
ALTER TABLE money_exchanges 
ALTER COLUMN unique_id SET NOT NULL;

-- Add check constraint for unique_id format
ALTER TABLE money_exchanges 
ADD CONSTRAINT check_unique_id_format 
CHECK (unique_id ~ '^ME-[0-9]{14}-[A-Z0-9]{6,8}$');
