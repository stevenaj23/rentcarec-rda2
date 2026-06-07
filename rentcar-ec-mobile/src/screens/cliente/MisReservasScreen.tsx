import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../../constants/colors';
import { reservasApi, Reserva } from '../../api/reservas.api';
import StatusBadge from '../../components/StatusBadge';
import { RootStackParams } from '../../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParams>;

function fmt(iso: string) { return iso.slice(0, 10); }

function statusIcon(status: string) {
  switch (status) {
    case 'CONFIRMADA':  return '✅';
    case 'ACTIVA':      return '🚗';
    case 'COMPLETADA':  return '🏁';
    case 'CANCELADA':   return '❌';
    default:            return '⏳';
  }
}

export default function MisReservasScreen() {
  const nav = useNavigation<Nav>();
  const [reservas,   setReservas]   = useState<Reserva[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await reservasApi.myList({ limit: 50 });
      setReservas(data.data ?? []);
    } catch {}
    finally { if (!quiet) setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Polling cada 12 segundos para reflejar cambios de estado hechos desde el panel admin
  useEffect(() => {
    const interval = setInterval(() => load(true), 12_000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  return (
    <FlatList
      style={styles.bg}
      contentContainerStyle={reservas.length === 0 ? styles.emptyWrap : styles.list}
      data={reservas}
      keyExtractor={r => r.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} colors={[Colors.primary]} />
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🗓️</Text>
          <Text style={styles.emptyTitle}>Sin reservas aún</Text>
          <Text style={styles.emptyText}>Explora el catálogo y reserva{'\n'}tu próximo vehículo</Text>
        </View>
      }
      renderItem={({ item: r }) => {
        const vehiculoNombre = r.vehiculo?.nombre ?? r.clienteNombre ?? `Vehículo #${r.vehiculoId.slice(0, 8)}`;
        const placa = r.vehiculo?.placa;
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('ReservaDetail', { reservaId: r.id })}
            activeOpacity={0.8}
          >
            {/* Top row: código + badge */}
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.codigo}>{r.codigoReserva}</Text>
                <Text style={styles.vehiculoNombre} numberOfLines={1}>{vehiculoNombre}</Text>
              </View>
              <StatusBadge status={r.status} />
            </View>

            {/* Fechas */}
            <View style={styles.datesRow}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateLabel}>Recogida</Text>
                <Text style={styles.dateVal}>{fmt(r.fechaInicio)}</Text>
              </View>
              <View style={styles.datesCenter}>
                <Text style={styles.daysText}>{r.diasTotal} día{r.diasTotal !== 1 ? 's' : ''}</Text>
                <Text style={styles.arrow}>→</Text>
              </View>
              <View style={[styles.dateBlock, { alignItems: 'flex-end' }]}>
                <Text style={styles.dateLabel}>Devolución</Text>
                <Text style={styles.dateVal}>{fmt(r.fechaFin)}</Text>
              </View>
            </View>

            {/* Bottom row */}
            <View style={styles.bottomRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14 }}>{statusIcon(r.status)}</Text>
                {placa && <Text style={styles.placa}>{placa}</Text>}
              </View>
              <Text style={styles.total}>${Number(r.totalAmount).toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  bg:            { flex: 1, backgroundColor: Colors.bg },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  list:          { padding: 16 },
  emptyWrap:     { flex: 1 },
  emptyBox:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptyText:     { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },

  card:          { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 4 },
  topRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  codigo:        { fontSize: 15, fontWeight: '800', color: Colors.text },
  vehiculoNombre:{ fontSize: 12, color: Colors.muted, marginTop: 2, fontWeight: '600' },

  datesRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 12, padding: 12, marginBottom: 12 },
  dateBlock:     { flex: 1 },
  dateLabel:     { fontSize: 10, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  dateVal:       { fontSize: 14, fontWeight: '700', color: Colors.text },
  datesCenter:   { alignItems: 'center', paddingHorizontal: 12 },
  daysText:      { fontSize: 11, color: Colors.primary, fontWeight: '700', marginBottom: 2 },
  arrow:         { color: Colors.muted, fontSize: 16 },

  bottomRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  placa:         { fontSize: 12, color: Colors.muted, fontWeight: '600', letterSpacing: 0.5 },
  total:         { color: Colors.primary, fontSize: 18, fontWeight: '800' },
});
