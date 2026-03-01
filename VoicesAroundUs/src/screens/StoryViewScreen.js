import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Switch, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { colors, fonts, TAG_COLORS } from '../theme';
import { TagPill } from '../components/TagPill';
import { useAuth } from '../hooks/useAuth';
import { getStory, getReplies, postReply, toggleResonate } from '../hooks/useStories';

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000));
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function StoryViewScreen({ route, navigation }) {
  const { storyId } = route.params;
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [story, setStory] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resonated, setResonated] = useState(false);
  const [resonateCount, setResonateCount] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [replyAnon, setReplyAnon] = useState(true);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [audioPositionMs, setAudioPositionMs] = useState(0);
  const soundRef = useRef(null);

  useEffect(() => {
    loadData();
    return () => {
      unloadAudio();
    };
  }, [storyId]);

  function onPlaybackStatusUpdate(status) {
    if (!status.isLoaded) return;
    setIsPlayingAudio(status.isPlaying);
    setAudioDurationMs(status.durationMillis || 0);
    setAudioPositionMs(status.positionMillis || 0);
    if (status.didJustFinish) {
      setIsPlayingAudio(false);
      setAudioPositionMs(0);
    }
  }

  async function unloadAudio() {
    if (!soundRef.current) return;
    try {
      soundRef.current.setOnPlaybackStatusUpdate(null);
      await soundRef.current.unloadAsync();
    } catch {
      // Ignore unload errors when leaving screen quickly.
    }
    soundRef.current = null;
  }

  async function handleAudioPlayback() {
    if (!story?.audio_url || audioBusy) return;

    try {
      setAudioBusy(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: story.audio_url },
          { shouldPlay: true, progressUpdateIntervalMillis: 250 },
          onPlaybackStatusUpdate
        );
        soundRef.current = sound;
      } else {
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) {
          await unloadAudio();
        } else if (status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else if (status.didJustFinish) {
          await soundRef.current.replayAsync();
        } else {
          await soundRef.current.playAsync();
        }
      }
    } catch {
      Alert.alert('Audio error', 'Could not play this voice memo.');
    } finally {
      setAudioBusy(false);
    }
  }

  async function loadData() {
    setLoading(true);
    const { data } = await getStory(storyId);
    if (data) {
      setStory(data);
      setResonateCount(data.resonates || 0);
    }
    const replyData = await getReplies(storyId);
    setReplies(replyData);
    setLoading(false);
  }

  async function handleResonate() {
    if (!user) { Alert.alert('Sign In', 'Sign in to resonate with stories.'); return; }
    const newCount = await toggleResonate(storyId, user.id, resonated);
    setResonated(!resonated);
    setResonateCount(newCount);
  }

  async function handleReply() {
    if (!user) { Alert.alert('Sign In', 'Sign in to reply.'); return; }
    if (!replyText.trim()) return;

    setReplySubmitting(true);
    const { error } = await postReply({
      storyId,
      authorId: user.id,
      body: replyText.trim(),
      isAnonymous: replyAnon,
      authorName: profile?.display_name || user.email?.split('@')[0],
      emoji: profile?.emoji || '💬',
    });
    setReplySubmitting(false);
    if (error) { Alert.alert('Error', 'Could not post reply.'); return; }

    setReplyText('');
    const replyData = await getReplies(storyId);
    setReplies(replyData);
  }

  if (loading || !story) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.locRow}>
            <Text>📍</Text>
            <Text style={styles.locText}>{story.location_name}</Text>
          </View>
          <Text style={styles.headline}>"{story.title}"</Text>
          <View style={styles.tagRow}>
            {(story.tags || []).map((t) => (
              <TagPill key={t} tag={t} />
            ))}
          </View>
        </View>

        {/* Body */}
        <View style={styles.bodyPad}>
          {/* Author */}
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>{story.emoji || '🌱'}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>
                {story.is_anonymous ? 'Anonymous' : (story.author_name || 'Anonymous')}
              </Text>
              <Text style={styles.authorDate}>Shared {timeAgo(story.created_at)}</Text>
            </View>
            <Text style={styles.resonateInfo}>🫂 {resonateCount}</Text>
          </View>

          {story.audio_url ? (
            <View style={styles.audioWrap}>
              <Text style={styles.audioLabel}>VOICE MEMO</Text>
              <TouchableOpacity
                style={[styles.audioPlayBtn, audioBusy && styles.audioPlayBtnDisabled]}
                onPress={handleAudioPlayback}
                disabled={audioBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.audioPlayBtnText}>
                  {audioBusy ? 'Loading…' : (isPlayingAudio ? '⏸ Pause audio' : '▶ Play audio')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.audioTime}>
                {formatDuration(audioPositionMs)} / {formatDuration(audioDurationMs)}
              </Text>
              {story.transcription_status === 'done' && !!story.transcript_text?.trim() && (
                <View style={styles.transcriptWrap}>
                  <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
                  <Text style={styles.transcriptText}>{story.transcript_text}</Text>
                </View>
              )}
              {(story.transcription_status === 'pending' || story.transcription_status === 'processing') && (
                <View style={styles.transcriptWrap}>
                  <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
                  <ActivityIndicator color={colors.amber} size="small" style={{ marginTop: 4 }} />
                  <Text style={styles.transcriptPending}>Transcribing audio…</Text>
                </View>
              )}
              {story.transcription_status === 'failed' && (
                <View style={styles.transcriptWrap}>
                  <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
                  <Text style={styles.transcriptFailed}>Transcription unavailable</Text>
                </View>
              )}
              {!!story.body?.trim() && (
                <View style={styles.prose}>
                  {story.body.split('\n\n').map((p, i) => (
                    <Text key={i} style={styles.proseText}>{p}</Text>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.prose}>
              {story.body.split('\n\n').map((p, i) => (
                <Text key={i} style={styles.proseText}>{p}</Text>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          {/* Reactions */}
          <View style={styles.reactRow}>
            <TouchableOpacity
              style={[styles.reactBtn, resonated && styles.reactBtnOn]}
              onPress={handleResonate}
            >
              <Text style={styles.reactBtnText}>
                🫂 {resonated ? 'Resonated!' : 'Resonate'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reactBtn}>
              <Text style={styles.reactBtnText}>🔖 Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.divider, { marginHorizontal: 24 }]} />

        {/* Replies */}
        <View style={styles.repliesSection}>
          <Text style={styles.sectionLabel}>
            REPLIES ({replies.length})
          </Text>

          {replies.length === 0 ? (
            <Text style={styles.noReplies}>Be the first to reply</Text>
          ) : (
            replies.map((r) => (
              <View key={r.id} style={styles.replyCard}>
                <View style={styles.replyMeta}>
                  <View style={styles.replyAv}>
                    <Text style={styles.replyAvText}>{r.emoji || '💬'}</Text>
                  </View>
                  <Text style={styles.replyAuthor}>
                    {r.is_anonymous ? 'Anonymous' : (r.author_name || 'Anonymous')}
                  </Text>
                  <Text style={styles.replyDate}>{timeAgo(r.created_at)}</Text>
                </View>
                <Text style={styles.replyBody}>"{r.body}"</Text>
              </View>
            ))
          )}

          {/* Reply Input */}
          {user ? (
            <View>
              <View style={styles.replyInputWrap}>
                <TextInput
                  style={styles.replyInput}
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Share your reflection…"
                  placeholderTextColor="#C4BAB0"
                  multiline
                />
                <TouchableOpacity
                  style={styles.replySend}
                  onPress={handleReply}
                  disabled={replySubmitting}
                >
                  <Text style={styles.replySendText}>↑</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.replyAnonRow}>
                <Switch
                  value={replyAnon}
                  onValueChange={setReplyAnon}
                  trackColor={{ false: colors.sandDark, true: colors.amber }}
                  thumbColor={colors.white}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
                <Text style={styles.replyAnonText}>Reply anonymously</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
              <Text style={styles.signInPrompt}>
                <Text style={styles.signInLink}>Sign in</Text> to leave a reply
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.parchment,
  },
  scroll: {
    flex: 1,
  },
  hero: {
    backgroundColor: colors.sand,
    paddingHorizontal: 24,
    paddingBottom: 26,
    borderBottomWidth: 1,
    borderBottomColor: colors.sandDark,
  },
  backBtn: {
    color: colors.amber,
    fontSize: 15,
    fontFamily: fonts.sansMedium,
    marginBottom: 18,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 11,
  },
  locText: {
    fontSize: 11.5,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
  },
  headline: {
    fontFamily: fonts.serifMedium,
    fontSize: 21,
    lineHeight: 26,
    color: colors.ink,
    marginBottom: 14,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  bodyPad: {
    padding: 22,
    paddingHorizontal: 24,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  authorName: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  authorDate: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
    fontFamily: fonts.sans,
  },
  resonateInfo: {
    marginLeft: 'auto',
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.sans,
  },
  prose: {
    gap: 18,
  },
  proseText: {
    fontFamily: fonts.serifItalic,
    fontSize: 16,
    lineHeight: 29,
    color: colors.inkSoft,
  },
  divider: {
    height: 1,
    backgroundColor: colors.sandDark,
    marginVertical: 22,
  },
  reactRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  reactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.sand,
    borderRadius: 100,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.sandDark,
  },
  reactBtnOn: {
    backgroundColor: colors.amberLight,
    borderColor: colors.amber,
  },
  reactBtnText: {
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.inkSoft,
  },
  repliesSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 14,
  },
  noReplies: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 12,
    fontFamily: fonts.sans,
  },
  replyCard: {
    backgroundColor: colors.sand,
    borderRadius: 14,
    padding: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.sandDark,
    marginBottom: 10,
  },
  replyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  replyAv: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyAvText: {
    fontSize: 14,
  },
  replyAuthor: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  replyDate: {
    fontSize: 11,
    color: colors.muted,
    marginLeft: 'auto',
    fontFamily: fonts.sans,
  },
  replyBody: {
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 22,
  },
  replyInputWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.sandDark,
    borderRadius: 14,
    padding: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    marginTop: 16,
  },
  replyInput: {
    flex: 1,
    fontFamily: fonts.serifItalic,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 22,
    minHeight: 44,
    maxHeight: 100,
  },
  replySend: {
    width: 34,
    height: 34,
    backgroundColor: colors.amber,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replySendText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  replyAnonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  replyAnonText: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.sans,
  },
  signInPrompt: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 12,
    fontFamily: fonts.sans,
  },
  signInLink: {
    color: colors.amber,
    fontFamily: fonts.sansMedium,
  },
  audioWrap: {
    marginBottom: 8,
  },
  audioLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 12,
  },
  audioPlayBtn: {
    backgroundColor: colors.amber,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  audioPlayBtnDisabled: {
    opacity: 0.6,
  },
  audioPlayBtnText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  audioTime: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.sans,
    textAlign: 'center',
    marginBottom: 16,
  },
  transcriptWrap: {
    backgroundColor: colors.sand,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.sandDark,
  },
  transcriptLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 8,
  },
  transcriptText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },
  transcriptPending: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.sans,
    marginTop: 6,
    textAlign: 'center',
  },
  transcriptFailed: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.sans,
    fontStyle: 'italic',
  },
});
