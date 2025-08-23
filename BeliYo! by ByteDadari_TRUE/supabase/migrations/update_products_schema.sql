/*
  # Update Products Schema for User Integration

  1. Schema Updates
    - Rename `seller_id` to `user_id` for consistency
    - Add `title` field (alias for name)
    - Add `condition` field for product condition
    - Add `is_sold` field for sold status
    - Add location data structure
    - Ensure proper indexes for performance

  2. Security
    - Update RLS policies for user-based access
    - Ensure users can only modify their own products
*/

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add user_id column if seller_id exists but user_id doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'seller_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE products RENAME COLUMN seller_id TO user_id;
  END IF;

  -- Add user_id if it doesn't exist at all
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE products ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add title column (alias for name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'title'
  ) THEN
    ALTER TABLE products ADD COLUMN title text;
    -- Copy existing name data to title
    UPDATE products SET title = name WHERE title IS NULL;
  END IF;

  -- Add condition column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'condition'
  ) THEN
    ALTER TABLE products ADD COLUMN condition text DEFAULT 'Good';
  END IF;

  -- Add is_sold column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_sold'
  ) THEN
    ALTER TABLE products ADD COLUMN is_sold boolean DEFAULT false;
  END IF;

  -- Add location column as JSONB
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'location'
  ) THEN
    ALTER TABLE products ADD COLUMN location jsonb DEFAULT '{"address": "", "coordinates": {"lat": 0, "lng": 0}}'::jsonb;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_is_sold ON products(is_sold);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can create products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

-- Create new comprehensive policies
CREATE POLICY "Users can manage own products"
  ON products
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view available products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);
