/*
  # Add Multiple Images Support to Products Table

  1. Schema Changes
    - Add `images` column to store array of image URLs
    - Keep `image_url` for backward compatibility (will store first image)
    - Add `image_count` for quick reference

  2. Notes
    - Maintains backward compatibility with existing single image functionality
    - New `images` column will store JSON array of image URLs
    - Maximum 5 images per product for performance
*/

-- Add new columns for multiple images support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'images'
  ) THEN
    ALTER TABLE products ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image_count'
  ) THEN
    ALTER TABLE products ADD COLUMN image_count integer DEFAULT 0;
  END IF;
END $$;

-- Create index for better performance on images column
CREATE INDEX IF NOT EXISTS idx_products_images ON products USING GIN (images);

-- Update existing products to have proper image_count
UPDATE products 
SET image_count = CASE 
  WHEN image_url IS NOT NULL THEN 1 
  ELSE 0 
END
WHERE image_count = 0;
