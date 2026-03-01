import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { colors, fonts, TAG_HEX, TAGS } from '../theme';
import { FilterChip } from '../components/TagPill';
import { useStories } from '../hooks/useStories';

MapboxGL.setAccessToken('pk.eyJ1Ijoidm9pY2VzLXN1cGFiYXNlIiwiYSI6ImNtbTg2b3Y0bDBhbjAyeHB5ajk1N2Voc3UifQ.1pPcF3PcSw3CRrZheft0iw');

const UCLA_CENTER = [-118.443, 34.072];

const OFFSET_COORDS = [
  [0.0008, -0.0002], [-0.0012, 0.0005], [0.0005, 0.0008],
  [-0.0002, -0.0005], [-0.0015, 0.0002], [0.001, -0.0002],
  [-0.0008, -0.0008], [0.0012, 0.0003],
];

function getCoords(story, index) {
  if (story.lat != null && story.lng != null) {
    return [story.lng, story.lat];
  }
  const off = OFFSET_COORDS[index % OFFSET_COORDS.length];
  return [UCLA_CENTER[0] + off[0], UCLA_CENTER[1] + off[1]];
}

export default function MapScreen({ navigation }) {
  const { stories, loading, fetchStories } = useStories();
  const [activeFilter, setActiveFilter] = useState('All');
  const [userLocation, setUserLocation] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation([loc.coords.longitude, loc.coords.latitude]);
      }
    })();
  }, []);

  const handleFilter = useCallback((tag) => {
    setActiveFilter(tag);
    fetchStories(tag);
  }, [fetchStories]);

  const filters = ['All', ...TAGS.slice(0, 6)];

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/streets-v12"
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={15.5}
          centerCoordinate={userLocation || UCLA_CENTER}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {userLocation && (
          <MapboxGL.PointAnnotation id="user-location" coordinate={userLocation}>
            <View style={styles.userDot}>
              <View style={styles.userDotInner} />
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {stories.map((story, i) => {
          const coords = getCoords(story, i);
          const pinColor = TAG_HEX[story.tags?.[0]] || '#722F37';
          return (
            <MapboxGL.PointAnnotation
              key={story.id}
              id={story.id}
              coordinate={coords}
              onSelected={() => navigation.navigate('StoryView', { storyId: story.id })}
            >
              <View style={[styles.pin, { backgroundColor: pinColor }]} />
              <MapboxGL.Callout title={story.title} />
            </MapboxGL.PointAnnotation>
          );
        })}
      </MapboxGL.MapView>

      <View style={styles.topOverlay}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={styles.searchText}>Search stories near you…</Text>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.amber} size="large" />
        </View>
      )}

      <View style={styles.bottomOverlay}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {filters.map((f) => (
            <FilterChip
              key={f}
              label={f}
              active={activeFilter === f}
              onPress={() => handleFilter(f)}
            />
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Submit')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5DDD4',
  },
  map: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  searchBar: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.sandDark,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  searchIcon: {
    fontSize: 16,
    color: colors.muted,
  },
  searchText: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.sans,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  chipScroll: {
    gap: 8,
    paddingRight: 16,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 68,
    width: 58,
    height: 58,
    backgroundColor: colors.amber,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 24,
    elevation: 10,
  },
  fabIcon: {
    fontSize: 26,
    color: colors.white,
    fontWeight: '300',
  },
  pin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  userDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(66,133,244,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4285F4',
    borderWidth: 2,
    borderColor: colors.white,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(234,227,216,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
