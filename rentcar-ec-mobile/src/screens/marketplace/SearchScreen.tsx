import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList,
  StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../../constants/colors';
import { vehiculosApi, Vehiculo } from '../../api/vehiculos.api';
import VehiculoCard from '../../components/VehiculoCard';
import { RootStackParams } from '../../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParams>;

export default function SearchScreen() {
  const nav = useNavigation<Nav>();
  const [vehiculos,   setVehiculos]   = useState<Vehiculo[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin,    setFechaFin]    = useState('');

  const diasTotal = (() => {
    if (!fechaInicio || !fechaFin) return 0;
    const diff = new Date(fechaFin).getTime() - new Date(fechaInicio).getTime();
    return Math.max(0, Math.ceil(diff / 86400000));
  })();

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    vehiculosApi.list({ limit: 50 })
      .then(({ data }) => setVehiculos(data.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Recarga al enfocar la pantalla (ej: volver de una reserva)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Polling cada 12s para reflejar vehículos que cambian a RESERVADO en tiempo real
  useEffect(() => {
    const interval = setInterval(() => load(true), 12_000);
    return () => clearInterval(interval);
  }, [load]);

  const Header = (
    <>
      {/* ── Barra de fecha ── */}
      <View style={styles.filterBar}>
        <View style={styles.dateGroup}>
          <Text style={styles.dateLabel}>📅  Inicio</Text>
          <TextInput
            style={styles.dateInput}
            value={fechaInicio}
            onChangeText={setFechaInicio}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={Colors.muted}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.dateSep} />

        <View style={styles.dateGroup}>
          <Text style={styles.dateLabel}>🏁  Fin</Text>
          <TextInput
            style={styles.dateInput}
            value={fechaFin}
            onChangeText={setFechaFin}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={Colors.muted}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* ── Resumen ── */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryCount}>
          {loading ? '…' : vehiculos.length} vehículos
        </Text>
        {diasTotal > 0 && (
          <View style={styles.daysBadge}>
            <Text style={styles.daysText}>
              {diasTotal} {diasTotal === 1 ? 'día' : 'días'}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.bg}>
        {Header}
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <FlatList
        contentContainerStyle={styles.list}
        data={vehiculos}
        keyExtractor={v => v.id}
        ListHeaderComponent={Header}
        renderItem={({ item }) => (
          <VehiculoCard
            vehiculo={item}
            diasTotal={diasTotal || undefined}
            onPress={() => nav.navigate('VehiculoDetail', {
              vehiculoId: item.id,
              fechaInicio: fechaInicio || undefined,
              fechaFin: fechaFin || undefined,
            })}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay vehículos disponibles</Text>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg:         { flex: 1, backgroundColor: Colors.bg },
  list:       { padding: 16 },

  // Filter bar
  filterBar:  { backgroundColor: Colors.card, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: Colors.border },
  dateGroup:  { flex: 1 },
  dateLabel:  { fontSize: 11, color: Colors.muted, fontWeight: '600', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateInput:  { color: Colors.text, fontSize: 15, fontWeight: '600', padding: 0 },
  dateSep:    { width: 1, height: 36, backgroundColor: Colors.border, marginHorizontal: 14 },

  // Summary row
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginVertical: 12 },
  summaryCount:{ color: Colors.muted, fontSize: 14, fontWeight: '600' },
  daysBadge:  { backgroundColor: `${Colors.primary}22`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  daysText:   { color: Colors.primary, fontWeight: '700', fontSize: 13 },

  empty:      { color: Colors.muted, textAlign: 'center', marginTop: 40, fontSize: 15 },
});
