-- =============================================
-- COMPLETE SUPABASE DATABASE SETUP FOR AUDIO TRANSCRIBER
-- =============================================

-- This script sets up the complete database schema for the Audio Transcriber app
-- Run this in your Supabase SQL Editor

-- =============================================
-- ENABLE NECESSARY EXTENSIONS
-- =============================================

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CLEAN UP EXISTING TABLES (IF ANY)
-- =============================================

-- Drop existing tables in correct order (child tables first)
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS recordings CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can update own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =============================================
-- CREATE CUSTOM FUNCTIONS
-- =============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- =============================================
-- CREATE MAIN TABLES
-- =============================================

-- Create recordings table
CREATE TABLE recordings (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uri TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'wav',
    transcription TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notes table
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    original_transcription TEXT,
    recording_id TEXT,
    recording_title TEXT,
    summary TEXT,
    key_points JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for recordings table
CREATE INDEX recordings_user_id_idx ON recordings(user_id);
CREATE INDEX recordings_created_at_idx ON recordings(created_at DESC);
CREATE INDEX recordings_updated_at_idx ON recordings(updated_at DESC);
CREATE INDEX recordings_title_idx ON recordings(title);

-- Indexes for notes table
CREATE INDEX notes_user_id_idx ON notes(user_id);
CREATE INDEX notes_created_at_idx ON notes(created_at DESC);
CREATE INDEX notes_updated_at_idx ON notes(updated_at DESC);
CREATE INDEX notes_recording_id_idx ON notes(recording_id);
CREATE INDEX notes_title_idx ON notes(title);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on recordings table
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notes table
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE RLS POLICIES FOR RECORDINGS
-- =============================================

-- Policy for viewing recordings
CREATE POLICY "Users can view own recordings" ON recordings
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy for inserting recordings
CREATE POLICY "Users can insert own recordings" ON recordings
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Policy for updating recordings
CREATE POLICY "Users can update own recordings" ON recordings
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for deleting recordings
CREATE POLICY "Users can delete own recordings" ON recordings
    FOR DELETE 
    USING (auth.uid() = user_id);

-- =============================================
-- CREATE RLS POLICIES FOR NOTES
-- =============================================

-- Policy for viewing notes
CREATE POLICY "Users can view own notes" ON notes
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy for inserting notes
CREATE POLICY "Users can insert own notes" ON notes
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Policy for updating notes
CREATE POLICY "Users can update own notes" ON notes
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for deleting notes
CREATE POLICY "Users can delete own notes" ON notes
    FOR DELETE 
    USING (auth.uid() = user_id);

-- =============================================
-- CREATE TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =============================================

-- Trigger for recordings table
CREATE TRIGGER update_recordings_updated_at
    BEFORE UPDATE ON recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for notes table
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON recordings TO authenticated;
GRANT ALL ON notes TO authenticated;

-- Grant permissions to anon users (for public access if needed)
GRANT USAGE ON SCHEMA public TO anon;

-- =============================================
-- VERIFY SETUP
-- =============================================

-- Check if tables were created successfully
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename IN ('recordings', 'notes')
ORDER BY tablename;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('recordings', 'notes')
ORDER BY tablename;

-- List all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('recordings', 'notes')
ORDER BY tablename, policyname;

-- Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('recordings', 'notes')
ORDER BY tablename, indexname;

-- =============================================
-- TEST DATA INSERTION (OPTIONAL)
-- =============================================

-- Uncomment the following lines to test data insertion
-- Note: This will only work if you have an authenticated user

/*
-- Test recording insertion
INSERT INTO recordings (id, user_id, uri, duration, title, file_type)
VALUES (
    'test-recording-1',
    auth.uid(),
    'test://recording.wav',
    30000,
    'Test Recording',
    'wav'
);

-- Test note insertion
INSERT INTO notes (id, user_id, title, content)
VALUES (
    'test-note-1',
    auth.uid(),
    'Test Note',
    'This is a test note content.'
);
*/

-- =============================================
-- ADDITIONAL CONFIGURATION
-- =============================================

-- Set up realtime subscriptions (optional)
-- This allows real-time updates in your app
ALTER PUBLICATION supabase_realtime ADD TABLE recordings;
ALTER PUBLICATION supabase_realtime ADD TABLE notes;

-- =============================================
-- FINAL STATUS CHECK
-- =============================================

-- Display final setup status
SELECT 
    'Setup completed successfully!' as status,
    NOW() as completed_at;

-- Show table counts
SELECT 
    'recordings' as table_name,
    COUNT(*) as record_count
FROM recordings
UNION ALL
SELECT 
    'notes' as table_name,
    COUNT(*) as record_count
FROM notes;