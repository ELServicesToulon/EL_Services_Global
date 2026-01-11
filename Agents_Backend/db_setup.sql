-- Run this SQL in your Supabase SQL Editor to setup the chatbot table
CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    sender text,
    content text,
    session_id text
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access" ON chat_messages;

CREATE POLICY "Public Access" ON chat_messages 
FOR ALL 
USING (true) 
WITH CHECK (true);
