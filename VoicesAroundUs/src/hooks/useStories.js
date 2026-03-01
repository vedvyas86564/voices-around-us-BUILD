import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

export function useStories() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStories = useCallback(async (tagFilter = 'All') => {
    setLoading(true);
    let query = supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (tagFilter && tagFilter !== 'All') {
      query = query.contains('tags', [tagFilter]);
    }

    const { data, error } = await query;
    setLoading(false);
    if (!error && data) setStories(data);
    return data || [];
  }, []);

  useEffect(() => {
    fetchStories();

    const channel = supabase
      .channel('stories-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'stories',
      }, (payload) => {
        setStories((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { stories, loading, fetchStories };
}

export async function getStory(id) {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function submitStory({
  authorId,
  title,
  body,
  locationName,
  lat,
  lng,
  tags,
  isAnonymous,
  emoji,
  authorName,
  audioUrl,
}) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  const { data, error } = await supabase.from('stories').insert({
    author_id: authorId,
    title,
    body,
    location_name: locationName,
    lat: Number.isFinite(latNum) ? latNum : null,
    lng: Number.isFinite(lngNum) ? lngNum : null,
    tags,
    is_anonymous: isAnonymous,
    emoji: emoji || '🌱',
    author_name: isAnonymous ? null : authorName,
    audio_url: audioUrl || null,
  }).select('id').single();
  return { data, error };
}

export async function getReplies(storyId) {
  const { data } = await supabase
    .from('replies')
    .select('*')
    .eq('story_id', storyId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function postReply({ storyId, authorId, body, isAnonymous, authorName, emoji }) {
  const { error } = await supabase.from('replies').insert({
    story_id: storyId,
    author_id: authorId,
    body,
    is_anonymous: isAnonymous,
    author_name: isAnonymous ? null : authorName,
    emoji: emoji || '💬',
  });
  return { error };
}

export async function toggleResonate(storyId, userId, isResonated) {
  if (isResonated) {
    await supabase.from('resonates').delete().eq('story_id', storyId).eq('user_id', userId);
  } else {
    await supabase.from('resonates').insert({ story_id: storyId, user_id: userId });
  }
  const { data } = await supabase.from('stories').select('resonates').eq('id', storyId).single();
  return data?.resonates || 0;
}

export async function getUserStories(userId) {
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('author_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}
