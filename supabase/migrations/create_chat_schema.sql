/*
  # Real-Time Chat System Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `created_at` (timestamp)
    - `channels`
      - `id` (uuid, primary key)
      - `name` (text)
      - `is_group` (boolean)
      - `created_at` (timestamp)
    - `messages`
      - `id` (uuid, primary key)
      - `channel_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `content` (text)
      - `created_at` (timestamp)
      - `status` (text) - 'sent', 'delivered', 'read'
    - `channel_memberships`
      - `id` (uuid, primary key)
      - `channel_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `joined_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to access their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_group boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent'
);

-- Create channel_memberships table
CREATE TABLE IF NOT EXISTS channel_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can access channels they are members of"
  ON channels
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM channel_memberships
    WHERE channel_memberships.channel_id = channels.id
    AND channel_memberships.user_id = auth.uid()
  ));

CREATE POLICY "Users can access messages in channels they are members of"
  ON messages
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM channel_memberships
    WHERE channel_memberships.channel_id = messages.channel_id
    AND channel_memberships.user_id = auth.uid()
  ));

CREATE POLICY "Users can access their channel memberships"
  ON channel_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
