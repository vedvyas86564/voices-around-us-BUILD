import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { getUserStories } from '../hooks/useStories';

export default function ProfileScreen({ navigation }) {
  const { user, profile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [myStories, setMyStories] = useState([]);
  const [stats, setStats] = useState({ stories: 0, resonates: 0, replies: 0 });

  useFocusEffect(
    useCallback(() => {
      if (user) loadMyStories();
    }, [user])
  );

  async function loadMyStories() {
    const data = await getUserStories(user.id);
    setMyStories(data);
    setStats({
      stories: data.length,
      resonates: data.reduce((s, r) => s + (r.resonates || 0), 0),
      replies: data.reduce((s, r) => s + (r.reply_count || 0), 0),
    });
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  if (!user) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyIcon}>🌱</Text>
        <Text style={styles.emptyTitle}>Not signed in</Text>
        <Text style={styles.emptySub}>Sign in to see your profile and stories.</Text>
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';
  const emoji = profile?.emoji || '🌱';
  const year = profile?.ucla_year || 'UCLA';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{emoji}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.sub}>{year}</Text>
          <View style={styles.statsBar}>
            <View style={styles.statCell}>
              <Text style={styles.statNum}>{stats.stories}</Text>
              <Text style={styles.statLabel}>STORIES</Text>
            </View>
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={styles.statNum}>{stats.resonates}</Text>
              <Text style={styles.statLabel}>RESONATES</Text>
            </View>
            <View style={[styles.statCell, styles.statBorder]}>
              <Text style={styles.statNum}>{stats.replies}</Text>
              <Text style={styles.statLabel}>REPLIES</Text>
            </View>
          </View>
        </View>

        {/* My Stories */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MY STORIES</Text>
          {myStories.length === 0 ? (
            <View style={styles.emptyStories}>
              <Text style={styles.emptyIcon}>🌱</Text>
              <Text style={styles.emptySub}>
                You haven't shared any stories yet.
              </Text>
            </View>
          ) : (
            myStories.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.storyCard}
                onPress={() => navigation.navigate('StoryView', { storyId: s.id })}
                activeOpacity={0.7}
              >
                <Text style={styles.storyTitle}>"{s.title}"</Text>
                <Text style={styles.storyLoc}>
                  📍 {s.location_name} · {(s.tags || []).join(', ')}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  hero: {
    backgroundColor: colors.sand,
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.sandDark,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.amber,
    marginBottom: 14,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 6,
  },
  avatarEmoji: {
    fontSize: 38,
  },
  name: {
    fontFamily: fonts.serifMedium,
    fontSize: 24,
    color: colors.ink,
  },
  sub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
    fontFamily: fonts.sans,
  },
  statsBar: {
    flexDirection: 'row',
    marginTop: 22,
    borderTopWidth: 1,
    borderTopColor: colors.sandDark,
    paddingTop: 22,
    width: '100%',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.sandDark,
  },
  statNum: {
    fontFamily: fonts.serifMedium,
    fontSize: 26,
    color: colors.ink,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
    marginTop: 2,
  },
  section: {
    padding: 22,
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.muted,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 14,
  },
  storyCard: {
    backgroundColor: colors.sand,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.sandDark,
    marginBottom: 10,
  },
  storyTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 4,
  },
  storyLoc: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.sans,
  },
  signOutBtn: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.sandDark,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.sans,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.parchment,
    paddingHorizontal: 24,
  },
  emptyStories: {
    alignItems: 'center',
    paddingVertical: 24,
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
  signInBtn: {
    backgroundColor: colors.amber,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 20,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 8,
  },
  signInBtnText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
});
