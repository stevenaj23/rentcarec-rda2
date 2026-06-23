import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

type Size = 'sm' | 'md' | 'lg';

const CFG: Record<Size, { box: number; font: number; name: number; tag: number; gap: number }> = {
  sm: { box: 30, font: 12, name: 15, tag: 7.5, gap: 8  },
  md: { box: 38, font: 15, name: 19, tag: 8.5, gap: 10 },
  lg: { box: 52, font: 20, name: 26, tag: 10,  gap: 13 },
};

export default function BrandLogo({
  size = 'md',
  showTagline = true,
}: {
  size?: Size;
  showTagline?: boolean;
}) {
  const c = CFG[size];
  return (
    <View style={[styles.row, { gap: c.gap }]}>
      {/* Ícono */}
      <View style={[styles.box, { width: c.box, height: c.box, borderRadius: c.box * 0.28 }]}>
        <Text style={[styles.boxLetters, { fontSize: c.font }]}>RC</Text>
      </View>
      {/* Wordmark */}
      <View>
        <Text style={[styles.wordmark, { fontSize: c.name }]}>
          <Text style={styles.orange}>Rent</Text>
          <Text style={styles.white}>Car</Text>
          <Text style={styles.orange}> Ec</Text>
        </Text>
        {showTagline && (
          <Text style={[styles.tagline, { fontSize: c.tag }]}>ECUADOR</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center' },
  box:        { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  boxLetters: { color: '#fff', fontWeight: '900', letterSpacing: 0.8 },
  wordmark:   { fontWeight: '800', letterSpacing: -0.4 },
  orange:     { color: Colors.primary },
  white:      { color: Colors.text },
  tagline:    { color: Colors.muted, fontWeight: '600', letterSpacing: 2.5, marginTop: 1 },
});
