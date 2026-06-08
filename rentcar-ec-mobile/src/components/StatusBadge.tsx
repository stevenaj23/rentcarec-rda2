import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface StatusCfg {
  label: string;
  color: string;
  icon:  keyof typeof Ionicons.glyphMap;
}

const STATUS_CONFIG: Record<string, StatusCfg> = {
  DISPONIBLE:    { label: 'Disponible',     color: Colors.success, icon: 'checkmark-circle' },
  RESERVADO:     { label: 'Reservado',      color: Colors.warning, icon: 'time' },
  EN_USO:        { label: 'En uso',         color: Colors.info,    icon: 'car-sport' },
  MANTENIMIENTO: { label: 'Mantenimiento',  color: Colors.primary, icon: 'construct' },
  INACTIVO:      { label: 'Inactivo',       color: Colors.muted,   icon: 'ban' },
  PENDIENTE:     { label: 'Pendiente',      color: Colors.warning, icon: 'time-outline' },
  CONFIRMADA:    { label: 'Confirmada',     color: Colors.info,    icon: 'checkmark-circle-outline' },
  ACTIVA:        { label: 'Activa',         color: Colors.success, icon: 'play-circle' },
  COMPLETADA:    { label: 'Completada',     color: Colors.muted,   icon: 'flag' },
  CANCELADA:     { label: 'Cancelada',      color: Colors.danger,  icon: 'close-circle' },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: Colors.muted, icon: 'ellipse-outline' as const };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '55' }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:   999,
    borderWidth:    1,
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
});
