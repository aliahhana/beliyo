/*
  # Create Products and Money Exchange Tables

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `seller_id` (uuid, references auth.users)
      - `name` (text) - Product name
      - `description` (text) - Product description
      - `price` (numeric) - Product price
      - `currency` (text) - Currency type (₩, RM, FREE)
      - `category` (text) - Product category
      - `image_url` (text) - Product image URL
      - `status` (text) - Product status (available, sold)
      - `created_at` (timestamp) - Creation time
      - `updated_at` (timestamp) - Last update time

    - `money_exchanges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `from_amount` (numeric) - Amount to exchange from
      - `from_currency` (text) - Currency to exchange from
      - `to_amount` (numeric) - Amount to exchange to
      - `to_currency` (text) - Currency to exchange to
      - `notes` (text) - Additional notes
      - `status` (text) - Exchange status (pending, completed, cancelled)
      - `created_at` (timestamp) - Creation time
      - `updated_at` (timestamp) - Last update time

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to create and read data
    - Add policies for users to update their own data
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  price numeric DEFAULT 0,
  currency text NOT NULL DEFAULT '₩',
  category text NOT NULL,
  image_url text,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create money_exchanges table
CREATE TABLE IF NOT EXISTS money_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  from_amount numeric NOT NULL,
  from_currency text NOT NULL,
  to_amount numeric NOT NULL,
  to_currency text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_exchanges ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Anyone can read products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Money exchanges policies
CREATE POLICY "Anyone can read money exchanges"
  ON money_exchanges
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create money exchanges"
  ON money_exchanges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own money exchanges"
  ON money_exchanges
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
