/*
  # Fix Condition Field Type

  1. Changes
    - Change condition field from text to integer
    - Set default value to 3 (Good)
    - Migrate existing text values to integers

  2. Mapping
    - 1 = Poor
    - 2 = Fair  
    - 3 = Good
    - 4 = Very Good
    - 5 = Excellent
*/

-- First, add a temporary column for the integer condition
DO $$
BEGIN
  -- Add temporary integer column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'condition_int'
  ) THEN
    ALTER TABLE products ADD COLUMN condition_int integer DEFAULT 3;
  END IF;
END $$;

-- Update the temporary column with integer values based on text values
UPDATE products 
SET condition_int = CASE 
  WHEN condition = 'Poor' THEN 1
  WHEN condition = 'Fair' THEN 2
  WHEN condition = 'Good' THEN 3
  WHEN condition = 'Very Good' THEN 4
  WHEN condition = 'Excellent' THEN 5
  ELSE 3  -- Default to Good
END
WHERE condition_int IS NULL OR condition_int = 3;

-- Drop the old text column and rename the new one
DO $$
BEGIN
  -- Drop old condition column if it exists and is text type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' 
    AND column_name = 'condition'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE products DROP COLUMN condition;
  END IF;
  
  -- Rename condition_int to condition if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'condition_int'
  ) THEN
    ALTER TABLE products RENAME COLUMN condition_int TO condition;
  END IF;
  
  -- If condition doesn't exist at all, create it as integer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'condition'
  ) THEN
    ALTER TABLE products ADD COLUMN condition integer DEFAULT 3;
  END IF;
END $$;
