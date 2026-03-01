import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  FlatList, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, TAGS } from '../theme';
import { FilterChip } from '../components/TagPill';
import StoryCard from '../components/StoryCard';
import { useStories } from '../hooks/useStories';

export default function ExploreScreen({ navigation }) {
  const { stories, loading, fetchStories } = useStories();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All');

  useFocusEffect(
    useCallback(() => {
      fetchStories(activeFilter);
    }, [activeFilter])
  );

  const handleFilter = (tag) => {
    setActiveFilter(tag);
    fetchStories(tag);
  };

  const filters = ['All', ...TAGS.slice(0, 5)];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Voices from around you</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {filters.map((f, i) => (
          <FilterChip
            key={f}
            label={f}
            active={activeFilter === f}
            onPress={() => handleFilter(f)}
            style={{ marginRight: i === filters.length - 1 ? 0 : 8 }}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.amber} size="large" />
        </View>
      ) : stories.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No stories yet</Text>
          <Text style={styles.emptySub}>
            Be the first to share a story with this tag.
          </Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <StoryCard
              story={item}
              onPress={() =>
                navigation.navigate('StoryView', { storyId: item.id })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    color: colors.ink,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.sans,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 4,
    paddingVertical: 8,
    minHeight: 64,
  },
  chipRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fonts.sans,
  },
});
