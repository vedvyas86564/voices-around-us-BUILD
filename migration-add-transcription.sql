-- ============================================================
--  Migration: Add transcription fields to stories
--  Paste into Supabase → SQL Editor → Run
-- ============================================================

alter table public.stories
  add column if not exists transcript_text text,
  add column if not exists transcription_status text default 'pending',
  add column if not exists transcription_error text,
  add column if not exists transcribed_at timestamptz;

-- Backfill: mark existing text-only stories (no audio) so they
-- don't appear as "pending transcription".
update public.stories
  set transcription_status = null
  where audio_url is null;
