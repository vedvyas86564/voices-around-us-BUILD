import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { TAG_COLORS, colors, fonts } from '../theme';

export function TagPill({ tag, style }) {
  const c = TAG_COLORS[tag] || { bg: colors.amberLight, text: colors.amber };
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.label, { color: c.text }]}>{tag}</Text>
    </View>
  );
}

export function TagSelector({ tag, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.selector,
        selected && styles.selectorOn,
      ]}
    >
      <Text style={[
        styles.selectorText,
        selected && styles.selectorTextOn,
      ]}>{tag}</Text>
    </TouchableOpacity>
  );
}

export function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, active && styles.chipOn]}
    >
      <Text style={[styles.chipText, active && styles.chipTextOn]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 100,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    letterSpacing: 0.2,
  },
  selector: {
    backgroundColor: colors.sand,
    borderWidth: 1.5,
    borderColor: colors.sandDark,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  selectorOn: {
    backgroundColor: colors.amberLight,
    borderColor: colors.amber,
  },
  selectorText: {
    fontSize: 12,
    fontFamily: fonts.sansMedium,
    color: colors.muted,
  },
  selectorTextOn: {
    color: colors.amber,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.sandDark,
    backgroundColor: colors.surface,
  },
  chipOn: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  chipText: {
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.inkSoft,
  },
  chipTextOn: {
    color: colors.white,
  },
});
