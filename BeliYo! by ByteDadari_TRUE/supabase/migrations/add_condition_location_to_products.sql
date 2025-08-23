/*
  # Add Condition and Location to Products Table

  1. Schema Changes
    - Add `condition` column to store item condition (1-5 stars)
    - Add `location` column to store item location

  2. Security
    - Existing RLS policies will automatically apply to new columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'condition'
  ) THEN
    ALTER TABLE products ADD COLUMN condition integer NOT NULL DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'location'
  ) THEN
    ALTER TABLE products ADD COLUMN location text NOT NULL DEFAULT '';
  END IF;
END $$;
