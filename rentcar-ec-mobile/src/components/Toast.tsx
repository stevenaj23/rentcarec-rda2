import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import {
  Animated, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ToastRef {
  show: (config: ToastConfig) => void;
}

const CFG: Record<ToastType, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { color: Colors.success, icon: 'checkmark-circle' },
  error:   { color: Colors.danger,  icon: 'close-circle' },
  warning: { color: Colors.warning, icon: 'warning' },
  info:    { color: Colors.info,    icon: 'information-circle' },
};

const Toast = forwardRef<ToastRef>((_, ref) => {
  const [cfg, setCfg]  = useState<ToastConfig | null>(null);
  const ty   = useRef(new Animated.Value(-140)).current;
  const op   = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    Animated.parallel([
      Animated.timing(ty, { toValue: -140, duration: 280, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0,    duration: 280, useNativeDriver: true }),
    ]).start(() => setCfg(null));
  };

  const show = (config: ToastConfig) => {
    if (timer.current) clearTimeout(timer.current);
    setCfg(config);
    ty.setValue(-140);
    op.setValue(0);
    Animated.parallel([
      Animated.spring(ty, { toValue: 0, useNativeDriver: true, bounciness: 5, speed: 14 }),
      Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(hide, config.duration ?? 3500);
  };

  useImperativeHandle(ref, () => ({ show }));

  if (!cfg) return null;

  const { color, icon } = CFG[cfg.type];

  return (
    <Animated.View
      style={[styles.wrap, { transform: [{ translateY: ty }], opacity: op }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.toast, { borderLeftColor: color }]}
        onPress={hide}
        activeOpacity={0.92}
      >
        <View style={[styles.iconBox, { backgroundColor: color + '25' }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{cfg.title}</Text>
          {cfg.message ? (
            <Text style={styles.msg} numberOfLines={2}>{cfg.message}</Text>
          ) : null}
        </View>
        <Ionicons name="close" size={16} color={Colors.muted} style={styles.x} />
      </TouchableOpacity>
    </Animated.View>
  );
});

export const toastRef = React.createRef<ToastRef>();

export function showToast(config: ToastConfig) {
  toastRef.current?.show(config);
}

export default Toast;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 9999,
    paddingTop: 54,
    paddingHorizontal: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 12,
    gap: 12,
  },
  iconBox: {
    width: 42, height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1 },
  title: { color: '#F8FAFC', fontWeight: '700', fontSize: 15 },
  msg:   { color: '#94A3B8', fontSize: 13, marginTop: 3, lineHeight: 18 },
  x:     { padding: 4 },
});
