/*
  # User Authentication Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `user_id` (text, unique) - Custom user ID for display
      - `email` (text, unique) - User's email address
      - `created_at` (timestamp) - Account creation time
      - `updated_at` (timestamp) - Last profile update time

  2. Security
    - Enable RLS on `profiles` table
    - Add policies for users to read and update their own profile
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'user_id',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;
