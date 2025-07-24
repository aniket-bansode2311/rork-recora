-- =============================================
-- COMPLETE PERFECTED SUPABASE DATABASE SETUP FOR AUDIO TRANSCRIBER
-- =============================================

-- This script sets up the complete database schema for the Audio Transcriber app,
-- including recordings, notes, and user profiles.
-- Run this in your Supabase SQL Editor.

-- =============================================
-- ENABLE NECESSARY EXTENSIONS
-- =============================================

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional cryptographic functions (optional, remove if not used)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CLEAN UP EXISTING TABLES AND OBJECTS (IF ANY)
-- =============================================

-- Drop existing triggers (must be dropped before functions that they use)
DROP TRIGGER IF EXISTS update_recordings_updated_at ON recordings;
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can update own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Drop existing tables in correct order (child tables first)
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS recordings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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
$$ LANGUAGE plpgsql;

-- Function to handle new user sign-ups and create a profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (NEW.id, NEW.email, NEW.email); -- Using email as initial username/full_name
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    recording_id TEXT REFERENCES recordings(id) ON DELETE SET NULL, -- Explicit FK, ON DELETE SET NULL for standalone notes
    original_transcription TEXT,
    summary TEXT,
    key_points JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
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

-- Indexes for profiles table
CREATE INDEX profiles_username_idx ON public.profiles(username);
CREATE INDEX profiles_updated_at_idx ON public.profiles(updated_at DESC);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on recordings table
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notes table
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Enable RLS for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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
    USING (auth.uid() = user_id);

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
    USING (auth.uid() = user_id);

-- Policy for deleting notes
CREATE POLICY "Users can delete own notes" ON notes
    FOR DELETE 
    USING (auth.uid() = user_id);

-- =============================================
-- CREATE RLS POLICIES FOR PROFILES
-- =============================================

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

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

-- Trigger to call the handle_new_user function after a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Optional: Add a trigger to update the updated_at column for profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant specific permissions to authenticated users (principle of least privilege)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recordings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Grant permissions to anon users (for public access if needed)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.profiles TO anon;

-- =============================================
-- SET UP REALTIME SUBSCRIPTIONS (OPTIONAL)
-- =============================================

-- This allows real-time updates in your app
ALTER PUBLICATION supabase_realtime ADD TABLE recordings;
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

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
WHERE tablename IN (
    'recordings',
    'notes',
    'profiles'
)
ORDER BY tablename;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN (
    'recordings',
    'notes',
    'profiles'
)
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
WHERE tablename IN (
    'recordings',
    'notes',
    'profiles'
)
ORDER BY tablename, policyname;

-- Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN (
    'recordings',
    'notes',
    'profiles'
)
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

-- Test profile update (after user signup)
UPDATE public.profiles
SET username = 'testuser',
    full_name = 'Test User'
WHERE id = auth.uid();
*/

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
FROM notes
UNION ALL
SELECT 
    'profiles' as table_name,
    COUNT(*) as record_count
FROM public.profiles;






import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabaseAdmin } from "../../../../lib/supabase";

const createRecordingSchema = z.object({
  id: z.string(),
  uri: z.string(),
  duration: z.number(),
  title: z.string(),
  fileType: z.string(),
  transcription: z.string().optional(),
  translatedTranscription: z.string().optional(),
  detectedLanguage: z.string().optional(),
  speakerSegments: z.array(z.object({
    speaker: z.string(),
    text: z.string(),
    start_time: z.number(),
    end_time: z.number(),
  })).optional(),
  speakers: z.array(z.string()).optional(),
  userId: z.string(),
});

export default publicProcedure
  .input(createRecordingSchema)
  .mutation(async ({ input }: { input: z.infer<typeof createRecordingSchema> }) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('recordings')
        .insert({
          id: input.id,
          user_id: input.userId,
          uri: input.uri,
          duration: input.duration,
          title: input.title,
          file_type: input.fileType,
          transcription: input.transcription,
          translated_transcription: input.translatedTranscription,
          detected_language: input.detectedLanguage,
          speaker_segments: input.speakerSegments ? JSON.stringify(input.speakerSegments) : null,
          speakers: input.speakers ? JSON.stringify(input.speakers) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating recording:', error);
        throw new Error(`Failed to save recording: ${error.message}`);
      }

      return {
        success: true,
        recording: {
          id: data.id,
          uri: data.uri,
          duration: data.duration,
          title: data.title,
          fileType: data.file_type,
          transcription: data.transcription,
          translatedTranscription: data.translated_transcription,
          detectedLanguage: data.detected_language,
          speakerSegments: data.speaker_segments ? JSON.parse(data.speaker_segments) : undefined,
          speakers: data.speakers ? JSON.parse(data.speakers) : undefined,
          createdAt: new Date(data.created_at),
        }
      };
    } catch (error) {
      console.error('Error creating recording:', error);
      throw new Error('Failed to save recording to database');
    }
  });