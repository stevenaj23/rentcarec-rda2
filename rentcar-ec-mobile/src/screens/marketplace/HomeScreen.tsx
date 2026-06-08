import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { vehiculosApi, Vehiculo } from '../../api/vehiculos.api';
import VehiculoCard from '../../components/VehiculoCard';
import SkeletonCard from '../../components/SkeletonCard';
import { RootStackParams } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import { useVehiculoVersion } from '../../context/VehiculoEventsContext';

type Nav = StackNavigationProp<RootStackParams>;

const STATS: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: '200+', label: 'Vehículos', icon: 'car-sport-outline' },
  { value: '3',    label: 'Ciudades',  icon: 'location-outline' },
  { value: '24/7', label: 'Soporte',   icon: 'shield-checkmark-outline' },
];

export default function HomeScreen() {
  const nav            = useNavigation<Nav>();
  const { user }       = useAuth();
  const firstName      = user?.nombres?.split(' ')[0] ?? 'Bienvenido';
  const [vehiculos,    setVehiculos]    = useState<Vehiculo[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [selectedCat,  setSelectedCat]  = useState('Todos');
  const [loadError,    setLoadError]    = useState(false);

  const loadSeq    = useRef(0);
  const sseVersion = useVehiculoVersion();

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    const seq = ++loadSeq.current;
    vehiculosApi.list({ limit: 30, status: 'DISPONIBLE' })
      .then(({ data }) => {
        if (seq !== loadSeq.current) return;
        setVehiculos(data.data.data ?? []);
        setLoadError(false);
      })
      .catch(() => {
        if (seq !== loadSeq.current) return;
        setLoadError(true);
      })
      .finally(() => {
        if (seq !== loadSeq.current) return;
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    const t1 = setTimeout(() => load(true), 2_000);
    const t2 = setTimeout(() => load(true), 6_000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [load]));

  useEffect(() => {
    const interval = setInterval(() => load(true), 2_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => { if (sseVersion > 0) load(true); }, [sseVersion, load]);

  const categories = ['Todos', ...Array.from(new Set(vehiculos.map(v => v.categoria.nombre)))];
  const filtered   = selectedCat === 'Todos'
    ? vehiculos
    : vehiculos.filter(v => v.categoria.nombre === selectedCat);

  const goSearch = () => (nav as any).getParent()?.navigate('SearchTab');

  const ListHeader = (
    <View>
      {/* ── Hero ── */}
      <View style={styles.hero}>
        <Text style={styles.greeting}>Hola, {firstName}</Text>
        <Text style={styles.heroTitle}>Encuentra el vehículo{'\n'}perfecto para tu viaje</Text>

        <TouchableOpacity style={styles.searchBar} onPress={goSearch} activeOpacity={0.8}>
          <Ionicons name="search-outline" size={18} color={Colors.muted} style={{ marginRight: 10 }} />
          <Text style={styles.searchPlaceholder}>Buscar por fecha y categoría…</Text>
          <View style={styles.searchArrow}>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        {STATS.map(({ value, label, icon }) => (
          <View key={label} style={styles.stat}>
            <Ionicons name={icon} size={22} color={Colors.primary} style={{ marginBottom: 4 }} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Categorías ── */}
      {!loading && categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catsScroll}
          contentContainerStyle={styles.catsContent}
        >
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, selectedCat === cat && styles.pillOn]}
              onPress={() => setSelectedCat(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillTxt, selectedCat === cat && styles.pillTxtOn]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Sección ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {selectedCat === 'Todos' ? 'Disponibles' : selectedCat}
        </Text>
        {!loading && <Text style={styles.sectionCount}>{filtered.length} vehículos</Text>}
      </View>

      {loading && (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.bg}
      contentContainerStyle={styles.content}
      data={loading ? [] : filtered}
      keyExtractor={v => v.id}
      ListHeaderComponent={ListHeader}
      renderItem={({ item }) => (
        <VehiculoCard
          vehiculo={item}
          onPress={() => nav.navigate('VehiculoDetail', { vehiculoId: item.id })}
        />
      )}
      ListEmptyComponent={
        !loading ? (
          <View style={styles.emptyBox}>
            <Ionicons
              name={loadError ? 'cloud-offline-outline' : 'car-outline'}
              size={48} color={Colors.border} style={{ marginBottom: 12 }}
            />
            <Text style={styles.empty}>
              {loadError
                ? 'No se pudo cargar.\nDesliza hacia abajo para reintentar.'
                : 'No hay vehículos disponibles\nen esta categoría.'}
            </Text>
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  bg:      { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: 16, paddingBottom: 24 },

  // Hero
  hero:              { backgroundColor: Colors.card, borderRadius: 20, padding: 22, marginTop: 10, marginBottom: 16 },
  greeting:          { fontSize: 13, color: Colors.primary, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  heroTitle:         { fontSize: 24, fontWeight: '800', color: Colors.text, lineHeight: 32, marginBottom: 18 },
  searchBar:         { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  searchPlaceholder: { flex: 1, color: Colors.muted, fontSize: 14 },
  searchArrow:       { backgroundColor: Colors.primary, width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Stats
  statsRow:  { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat:      { flex: 1, backgroundColor: Colors.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 10, color: Colors.muted, marginTop: 2, fontWeight: '600' },

  // Categorías
  catsScroll:  { marginBottom: 16 },
  catsContent: { gap: 8, paddingRight: 4 },
  pill:        { backgroundColor: Colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  pillOn:      { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillTxt:     { color: Colors.muted, fontWeight: '600', fontSize: 13 },
  pillTxtOn:   { color: '#fff' },

  // Sección
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sectionCount: { fontSize: 12, color: Colors.muted },

  emptyBox: { alignItems: 'center', marginTop: 40, paddingHorizontal: 32 },
  empty:    { color: Colors.muted, textAlign: 'center', fontSize: 15, lineHeight: 22 },
});
