import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Platform, ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

const UCLA_CENTER = { latitude: 34.072, longitude: -118.443 };

export default function LocationPicker({ visible, onClose, onConfirm, initialCoords }) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState(initialCoords || UCLA_CENTER);
  const [resolvedName, setResolvedName] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (visible) {
      setPin(initialCoords || UCLA_CENTER);
      reverseGeocode(initialCoords || UCLA_CENTER);
    }
  }, [visible]);

  async function reverseGeocode(coord) {
    setResolving(true);
    try {
      const [place] = await Location.reverseGeocodeAsync({
        latitude: coord.latitude,
        longitude: coord.longitude,
      });
      if (place) {
        const name = [place.name, place.city].filter(Boolean).join(', ');
        setResolvedName(name || 'Selected location');
      } else {
        setResolvedName('Selected location');
      }
    } catch {
      setResolvedName('Selected location');
    }
    setResolving(false);
  }

  function handleDragEnd(e) {
    const coord = e.nativeEvent.coordinate;
    setPin(coord);
    reverseGeocode(coord);
  }

  function handleMapPress(e) {
    const coord = e.nativeEvent.coordinate;
    setPin(coord);
    reverseGeocode(coord);
  }

  function handleConfirm() {
    onConfirm({
      latitude: pin.latitude,
      longitude: pin.longitude,
      name: resolvedName,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Choose Location</Text>
          <View style={{ width: 50 }} />
        </View>

        <MapView
          style={styles.map}
          initialRegion={{
            ...(initialCoords || UCLA_CENTER),
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }}
          showsUserLocation
          onPress={handleMapPress}
        >
          <Marker
            coordinate={pin}
            draggable
            onDragEnd={handleDragEnd}
          >
            <View style={styles.pinOuter}>
              <View style={styles.pinInner} />
            </View>
          </Marker>
        </MapView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.locationInfo}>
            <Text style={styles.pinEmoji}>📍</Text>
            {resolving ? (
              <ActivityIndicator color={colors.amber} size="small" />
            ) : (
              <Text style={styles.locationName} numberOfLines={1}>
                {resolvedName}
              </Text>
            )}
          </View>
          <Text style={styles.hint}>Tap or drag the pin to set location</Text>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.sandDark,
  },
  cancelBtn: {
    color: colors.amber,
    fontSize: 15,
    fontFamily: fonts.sansMedium,
    width: 50,
  },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    color: colors.ink,
  },
  map: {
    flex: 1,
  },
  pinOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(114,47,55,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.amber,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.sandDark,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pinEmoji: {
    fontSize: 16,
  },
  locationName: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.sans,
    marginBottom: 14,
  },
  confirmBtn: {
    backgroundColor: colors.amber,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 8,
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
});
