/*
  # Create Storage Bucket for Product Images

  1. Storage Configuration
    - Create 'product-images' bucket in Supabase Storage
    - Set public access for image URLs
    - Configure CORS for web access

  2. Security
    - Enable RLS on storage.objects
    - Add policies for authenticated users to upload and manage their own files
*/

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Set CORS policy
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png']
WHERE id = 'product-images';

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage policies
CREATE POLICY "Allow public read access"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated uploads"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow users to delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner);
