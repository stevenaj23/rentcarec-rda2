import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList,
  StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../../constants/colors';
import { vehiculosApi, Vehiculo } from '../../api/vehiculos.api';
import VehiculoCard from '../../components/VehiculoCard';
import DateRangePicker from '../../components/DateRangePicker';
import { RootStackParams } from '../../navigation/AppNavigator';
import { useVehiculoVersion } from '../../context/VehiculoEventsContext';

type Nav = StackNavigationProp<RootStackParams>;

export default function SearchScreen() {
  const nav = useNavigation<Nav>();
  const [vehiculos,   setVehiculos]   = useState<Vehiculo[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin,    setFechaFin]    = useState('');

  const diasTotal = (() => {
    if (!fechaInicio || !fechaFin) return 0;
    const diff = new Date(fechaFin).getTime() - new Date(fechaInicio).getTime();
    return Math.max(0, Math.ceil(diff / 86400000));
  })();

  const loadSeq = useRef(0);

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    const seq = ++loadSeq.current;
    vehiculosApi.list({ limit: 50, status: 'DISPONIBLE' })
      .then(({ data }) => {
        if (seq !== loadSeq.current) return;
        setVehiculos(data.data.data ?? []);
      })
      .catch(() => {
        if (seq !== loadSeq.current) return;
        if (!quiet) setLoading(false);
      })
      .finally(() => {
        if (seq !== loadSeq.current) return;
        if (!quiet) setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    return () => {};
  }, [load]));

  useEffect(() => {
    const interval = setInterval(() => load(true), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const sseVersion = useVehiculoVersion();
  useEffect(() => { if (sseVersion > 0) load(true); }, [sseVersion, load]);

  const Header = (
    <>
      <DateRangePicker
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onChangeFechaInicio={setFechaInicio}
        onChangeFechaFin={setFechaFin}
      />

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
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
  bg:   { flex: 1, backgroundColor: Colors.bg },
  list: { padding: 16 },

  summaryRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginVertical: 12 },
  summaryCount: { color: Colors.muted, fontSize: 14, fontWeight: '600' },
  daysBadge:    { backgroundColor: `${Colors.primary}22`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  daysText:     { color: Colors.primary, fontWeight: '700', fontSize: 13 },

  empty: { color: Colors.muted, textAlign: 'center', marginTop: 40, fontSize: 15 },
});
