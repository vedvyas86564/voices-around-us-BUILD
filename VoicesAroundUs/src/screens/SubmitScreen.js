import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Switch, Alert, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { colors, fonts, TAGS } from '../theme';
import { TagSelector } from '../components/TagPill';
import { useAuth } from '../hooks/useAuth';
import { submitStory } from '../hooks/useStories';
import { supabase } from '../config/supabase';
import LocationPicker from '../components/LocationPicker';

export default function SubmitScreen({ navigation }) {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [locationName, setLocationName] = useState('');
  const [storyText, setStoryText] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [storyType, setStoryType] = useState('text');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState(null);

  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Audio state
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        const [place] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (place) {
          const name = [place.name, place.city].filter(Boolean).join(', ');
          setLocationName(name || 'UCLA Campus');
        }
      }
    })();
  }, []);

  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Permission needed', 'Allow microphone access to record audio.'); return; }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);

      // Auto-stop after 120s
      setTimeout(() => { if (rec) stopRecording(rec); }, 120000);
    } catch (err) {
      Alert.alert('Error', 'Could not start recording');
    }
  }

  async function stopRecording(rec) {
    const r = rec || recording;
    if (!r) return;
    setIsRecording(false);
    await r.stopAndUnloadAsync();
    const uri = r.getURI();
    const status = await r.getStatusAsync();
    setRecordingUri(uri);
    setRecordingDuration(Math.round((status.durationMillis || 0) / 1000));
    setRecording(null);
  }

  async function handleSubmit() {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to share a story.');
      navigation.navigate('Auth');
      return;
    }

    if (storyType === 'text' && (!storyText || storyText.length < 20)) {
      setError('Write at least 20 characters for your story.');
      return;
    }
    if (storyType === 'audio' && !recordingUri) {
      setError('Record a voice memo before sharing.');
      return;
    }
    if (!locationName) {
      setError('Add a location.');
      return;
    }

    setSubmitting(true);
    setError('');

    const cleanedText = storyText.trim();
    const titleFromText = cleanedText.split(/[.!?]/)[0].trim().slice(0, 80);
    let audioUrl = null;

    if (storyType === 'audio' && recordingUri) {
      try {
        const fileName = `memo-${Date.now()}.m4a`;
        const filePath = `${user.id}/${fileName}`;
        const fileRes = await fetch(recordingUri);
        const fileBuffer = await fileRes.arrayBuffer();

        const { error: uploadErr } = await supabase.storage
          .from('story-audio')
          .upload(filePath, fileBuffer, {
            contentType: 'audio/m4a',
            upsert: false,
          });

        if (uploadErr) {
          setSubmitting(false);
          setError(uploadErr.message || 'Could not upload voice memo.');
          return;
        }

        const { data: publicData } = supabase.storage
          .from('story-audio')
          .getPublicUrl(filePath);

        audioUrl = publicData?.publicUrl || null;
        if (!audioUrl) {
          setSubmitting(false);
          setError('Could not create an audio URL.');
          return;
        }
      } catch {
        setSubmitting(false);
        setError('Could not upload voice memo.');
        return;
      }
    }

    const title = storyType === 'audio'
      ? (titleFromText || `Voice memo from ${locationName.split(',')[0] || 'this place'}`)
      : (titleFromText || 'A moment here');

    const { data: insertedRow, error: submitErr } = await submitStory({
      authorId: user.id,
      title,
      body: cleanedText,
      locationName,
      lat: coords?.lat,
      lng: coords?.lng,
      tags: selectedTags,
      isAnonymous,
      emoji: profile?.emoji || '🌱',
      authorName: profile?.display_name || user.email?.split('@')[0],
      audioUrl,
    });

    setSubmitting(false);

    if (submitErr) {
      setError(submitErr.message);
      return;
    }

    if (audioUrl && insertedRow?.id) {
      supabase.functions.invoke('transcribe-story-audio', {
        body: { storyId: insertedRow.id, audioUrl },
      }).catch(() => {});
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setStoryText('');
      setSelectedTags([]);
      setRecordingUri(null);
      setRecordingDuration(0);
      navigation.goBack();
    }, 1400);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Share your story</Text>
        <Text style={styles.subtitle}>Tie a moment to this place</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Location */}
        <View style={styles.group}>
          <Text style={styles.label}>LOCATION</Text>
          <TouchableOpacity
            style={styles.locBox}
            onPress={() => setShowLocationPicker(true)}
            activeOpacity={0.7}
          >
            <Text>📍</Text>
            <Text style={[styles.locInput, !locationName && { color: '#C4BAB0' }]}>
              {locationName || 'Tap to choose location…'}
            </Text>
            <Text style={styles.locChange}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Story Type Toggle */}
        <View style={styles.group}>
          <Text style={styles.label}>STORY TYPE</Text>
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeOpt, storyType === 'text' && styles.typeOptOn]}
              onPress={() => setStoryType('text')}
            >
              <Text style={[styles.typeOptText, storyType === 'text' && styles.typeOptTextOn]}>
                ✍️ Text
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeOpt, storyType === 'audio' && styles.typeOptOn]}
              onPress={() => setStoryType('audio')}
            >
              <Text style={[styles.typeOptText, storyType === 'audio' && styles.typeOptTextOn]}>
                🎙 Audio
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Text Input */}
        {storyType === 'text' && (
          <View style={styles.group}>
            <Text style={styles.label}>YOUR STORY</Text>
            <TextInput
              style={styles.textArea}
              value={storyText}
              onChangeText={setStoryText}
              placeholder="Something happened here that changed how I see the world…"
              placeholderTextColor="#C4BAB0"
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, storyText.length > 430 && styles.charWarn]}>
              {storyText.length} / 500
            </Text>
          </View>
        )}

        {/* Audio Input */}
        {storyType === 'audio' && (
          <View style={styles.group}>
            <Text style={styles.label}>RECORD AUDIO (MAX 2 MIN)</Text>
            <View style={styles.audioBox}>
              <Text style={styles.audioIcon}>🎙</Text>
              {recordingUri ? (
                <Text style={styles.audioStatus}>
                  Recording saved ({recordingDuration}s)
                </Text>
              ) : (
                <Text style={styles.audioHint}>Tap to begin recording</Text>
              )}
              <TouchableOpacity
                style={styles.recordBtn}
                onPress={isRecording ? () => stopRecording() : startRecording}
              >
                <Text style={styles.recordBtnText}>
                  {isRecording ? '⏹ Stop' : recordingUri ? '🔄 Re-record' : 'Start Recording'}
                </Text>
              </TouchableOpacity>
            </View>
            {recordingUri && (
              <TextInput
                style={[styles.textArea, { height: 80, marginTop: 12 }]}
                value={storyText}
                onChangeText={setStoryText}
                placeholder="Add a text description (optional)…"
                placeholderTextColor="#C4BAB0"
                multiline
                maxLength={500}
              />
            )}
          </View>
        )}

        {/* Tags */}
        <View style={styles.group}>
          <Text style={styles.label}>TAGS</Text>
          <View style={styles.tagGrid}>
            {TAGS.map((tag) => (
              <TagSelector
                key={tag}
                tag={tag}
                selected={selectedTags.includes(tag)}
                onPress={() => toggleTag(tag)}
              />
            ))}
          </View>
        </View>

        {/* Anonymous */}
        <View style={styles.group}>
          <View style={styles.anonRow}>
            <View>
              <Text style={styles.anonLabel}>Post anonymously</Text>
              <Text style={styles.anonSub}>Your name won't appear</Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: colors.sandDark, true: colors.amber }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            submitting && styles.submitBtnDisabled,
            submitted && styles.submitBtnDone,
          ]}
          onPress={handleSubmit}
          disabled={submitting || submitted}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            {submitted ? '✓ Shared!' : submitting ? 'Sharing…' : 'Share Story →'}
          </Text>
        </TouchableOpacity>
      </View>
      <LocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        initialCoords={coords ? { latitude: coords.lat, longitude: coords.lng } : null}
        onConfirm={({ latitude, longitude, name }) => {
          setCoords({ lat: latitude, lng: longitude });
          setLocationName(name);
          setShowLocationPicker(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.sandDark,
  },
  backBtn: {
    color: colors.amber,
    fontSize: 15,
    fontFamily: fonts.sansMedium,
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 23,
    color: colors.ink,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13.5,
    color: colors.muted,
    fontFamily: fonts.sans,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingHorizontal: 24,
  },
  errorBox: {
    backgroundColor: '#FEF0EE',
    borderWidth: 1,
    borderColor: '#F5C6C0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    fontFamily: fonts.sans,
  },
  group: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 9,
  },
  locBox: {
    backgroundColor: colors.sand,
    borderRadius: 14,
    padding: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.sandDark,
  },
  locInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
  },
  locChange: {
    fontSize: 13,
    color: colors.amber,
    fontFamily: fonts.sansSemiBold,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.sand,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.sandDark,
    gap: 4,
  },
  typeOpt: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeOptOn: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  typeOptText: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.sans,
  },
  typeOptTextOn: {
    color: colors.ink,
    fontFamily: fonts.sansMedium,
  },
  textArea: {
    backgroundColor: colors.sand,
    borderWidth: 1.5,
    borderColor: colors.sandDark,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    color: colors.ink,
    height: 118,
    lineHeight: 25,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'right',
    marginTop: 5,
    fontFamily: fonts.sans,
  },
  charWarn: {
    color: colors.amber,
  },
  audioBox: {
    backgroundColor: colors.sand,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.sandDark,
    borderStyle: 'dashed',
  },
  audioIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  audioHint: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 18,
    fontFamily: fonts.sans,
  },
  audioStatus: {
    fontSize: 14,
    color: colors.ink,
    marginBottom: 18,
    fontFamily: fonts.sansMedium,
  },
  recordBtn: {
    backgroundColor: colors.amber,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  recordBtnText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.sand,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.sandDark,
  },
  anonLabel: {
    fontSize: 14,
    color: colors.ink,
    fontFamily: fonts.sansMedium,
  },
  anonSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    fontFamily: fonts.sans,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  submitBtn: {
    backgroundColor: colors.amber,
    borderRadius: 16,
    padding: 17,
    alignItems: 'center',
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnDone: {
    backgroundColor: colors.green,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    letterSpacing: -0.2,
  },
});
