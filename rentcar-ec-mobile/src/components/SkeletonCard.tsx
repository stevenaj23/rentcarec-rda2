import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export default function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4,  duration: 750, useNativeDriver: true }),
      ])
    ).start();
    return () => pulse.stopAnimation();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: pulse }]}>
      <View style={styles.img} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={[styles.block, { flex: 0.55, height: 16 }]} />
          <View style={[styles.block, { width: 64, height: 22, borderRadius: 10 }]} />
        </View>
        <View style={[styles.block, { width: '72%', height: 11, marginTop: 10 }]} />
        <View style={[styles.priceRow]}>
          <View style={[styles.block, { width: 80, height: 22 }]} />
          <View style={[styles.block, { width: 32, height: 26 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card:     { backgroundColor: Colors.card, borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  img:      { width: '100%', height: 190, backgroundColor: Colors.border },
  body:     { padding: 14, gap: 0 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  block:    { backgroundColor: Colors.border, borderRadius: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
});
