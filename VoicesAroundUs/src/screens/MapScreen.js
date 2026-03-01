import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors, fonts, TAG_HEX, TAGS } from '../theme';
import { FilterChip } from '../components/TagPill';
import { useStories } from '../hooks/useStories';

const UCLA_CENTER = { latitude: 34.072, longitude: -118.443 };

const OFFSET_COORDS = [
  { lng: 0.0008, lat: -0.0002 }, { lng: -0.0012, lat: 0.0005 },
  { lng: 0.0005, lat: 0.0008 }, { lng: -0.0002, lat: -0.0005 },
  { lng: -0.0015, lat: 0.0002 }, { lng: 0.001, lat: -0.0002 },
  { lng: -0.0008, lat: -0.0008 }, { lng: 0.0012, lat: 0.0003 },
];

function getCoords(story, index) {
  const lat = Number(story.lat);
  const lng = Number(story.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }
  const off = OFFSET_COORDS[index % OFFSET_COORDS.length];
  return {
    latitude: UCLA_CENTER.latitude + off.lat,
    longitude: UCLA_CENTER.longitude + off.lng,
  };
}

export default function MapScreen({ navigation }) {
  const { stories, loading, fetchStories } = useStories();
  const [activeFilter, setActiveFilter] = useState('All');
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
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
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          ...UCLA_CENTER,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {stories.map((story, i) => {
          const coords = getCoords(story, i);
          const pinColor = TAG_HEX[story.tags?.[0]] || '#722F37';
          return (
            <Marker
              key={story.id}
              coordinate={coords}
              onPress={() => navigation.navigate('StoryView', { storyId: story.id })}
            >
              <View style={[styles.pin, { backgroundColor: pinColor }]} />
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutText} numberOfLines={2}>
                    "{story.title}"
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

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
    backgroundColor: colors.surface,
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
  callout: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    maxWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  calloutText: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(234,227,216,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
