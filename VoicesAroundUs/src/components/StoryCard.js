import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, TAG_COLORS } from '../theme';
import { TagPill } from './TagPill';

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function StoryCard({ story, onPress }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.locRow}>
        <Text style={styles.locIcon}>📍</Text>
        <Text style={styles.locText}>
          {story.location_name?.split(',')[0]}
        </Text>
      </View>
      <Text style={styles.title}>"{story.title}"</Text>
      <Text style={styles.preview} numberOfLines={2}>
        {story.audio_url
          ? (story.body?.trim() ? `🎙 ${story.body}` : '🎙 Audio story')
          : story.body}
      </Text>
      <View style={styles.footer}>
        <View style={styles.tags}>
          {(story.tags || []).slice(0, 2).map((t) => (
            <TagPill key={t} tag={t} />
          ))}
        </View>
        <Text style={styles.time}>{timeAgo(story.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.sandDark,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  locIcon: {
    fontSize: 11,
  },
  locText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 17,
    color: colors.ink,
    marginBottom: 8,
    lineHeight: 22,
  },
  preview: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 10,
    fontFamily: fonts.sans,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    gap: 5,
  },
  time: {
    fontSize: 11,
    color: colors.muted,
    fontFamily: fonts.sans,
  },
});
