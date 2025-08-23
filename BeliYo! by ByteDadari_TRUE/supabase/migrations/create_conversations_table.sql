/*
  # Create Conversations and Messages Tables

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `participant1_id` (uuid, foreign key to auth.users)
      - `participant2_id` (uuid, foreign key to auth.users)
      - `context_type` (text) - 'shop', 'exchange', 'mission', or 'general'
      - `context_id` (uuid, nullable) - reference to product/exchange/mission
      - `last_message` (text, nullable)
      - `last_message_at` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `messages` (if not exists)
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key)
      - `sender_id` (uuid, foreign key to auth.users)
      - `content` (text)
      - `is_read` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to access their conversations and messages
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  participant2_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  context_type text NOT NULL CHECK (context_type IN ('shop', 'exchange', 'mission', 'general')),
  context_id uuid,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(participant1_id, participant2_id, context_type, context_id)
);

-- Create messages table if not exists
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_context ON conversations(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Create policies for conversations
CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = participant1_id OR 
    auth.uid() = participant2_id
  );

CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = participant1_id OR 
    auth.uid() = participant2_id
  );

CREATE POLICY "Users can update their conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = participant1_id OR 
    auth.uid() = participant2_id
  );

-- Create policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );
