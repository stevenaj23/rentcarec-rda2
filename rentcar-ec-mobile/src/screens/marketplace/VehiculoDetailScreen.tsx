import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { vehiculosApi, Vehiculo } from '../../api/vehiculos.api';
import StatusBadge from '../../components/StatusBadge';
import { RootStackParams } from '../../navigation/AppNavigator';
import { imgSource } from '../../utils/imageUrl';

type Route = RouteProp<RootStackParams, 'VehiculoDetail'>;
type Nav   = StackNavigationProp<RootStackParams>;

const SPEC_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Categoría':   'pricetag-outline',
  'Combustible': 'flame-outline',
  'Transmisión': 'settings-outline',
  'Pasajeros':   'people-outline',
  'Año':         'calendar-outline',
  'Kilometraje': 'speedometer-outline',
};

export default function VehiculoDetailScreen() {
  const { params } = useRoute<Route>();
  const nav = useNavigation<Nav>();
  const [vehiculo,   setVehiculo]   = useState<Vehiculo | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [imgError,   setImgError]   = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    vehiculosApi.getById(params.vehiculoId)
      .then(({ data }) => setVehiculo(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.vehiculoId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!vehiculo) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.muted, fontSize: 16 }}>Vehículo no encontrado</Text>
      </View>
    );
  }

  const nombre = `${vehiculo.modelo.marca.nombre} ${vehiculo.modelo.nombre}`;
  const disponible = vehiculo.status === 'DISPONIBLE';
  const src = imgSource(vehiculo.imagenUrl);

  const specs = [
    ['Categoría',   vehiculo.categoria.nombre],
    ['Combustible', vehiculo.tipoCombustible.nombre],
    ['Transmisión', vehiculo.tipoTransmision.nombre],
    ['Pasajeros',   `${vehiculo.numeroPasajeros} personas`],
    ['Año',         `${vehiculo.anio}`],
    ['Kilometraje', `${vehiculo.kilometraje.toLocaleString()} km`],
  ];

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── Imagen ── */}
        <View style={styles.imgContainer}>
          {src && !imgError ? (
            <>
              {imgLoading && (
                <View style={styles.imgPlaceholder}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              )}
              <Image
                source={src}
                style={styles.img}
                resizeMode="cover"
                onLoad={() => setImgLoading(false)}
                onError={() => { setImgError(true); setImgLoading(false); }}
              />
            </>
          ) : (
            <View style={styles.imgFallback}>
              <Ionicons name="car-sport" size={80} color={Colors.border} />
            </View>
          )}
          <View style={styles.imgOverlay}>
            <View style={styles.overlayContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.overlayNombre} numberOfLines={1}>{nombre}</Text>
                <Text style={styles.overlayAnio}>{vehiculo.anio}  ·  {vehiculo.color}</Text>
              </View>
              <StatusBadge status={vehiculo.status} />
            </View>
          </View>
        </View>

        {/* ── Placa ── */}
        <View style={styles.placaRow}>
          <Text style={styles.placaLabel}>Placa</Text>
          <View style={styles.placaBadge}>
            <Text style={styles.placaText}>{vehiculo.placa}</Text>
          </View>
        </View>

        {/* ── Especificaciones ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Especificaciones</Text>
          <View style={styles.specsGrid}>
            {specs.map(([label, value]) => (
              <View key={label} style={styles.specItem}>
                <Ionicons
                  name={SPEC_ICONS[label] ?? 'information-circle-outline'}
                  size={20}
                  color={Colors.primary}
                  style={{ marginBottom: 6 }}
                />
                <Text style={styles.specLabel}>{label}</Text>
                <Text style={styles.specValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Descripción ── */}
        {vehiculo.descripcion ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Descripción</Text>
            <Text style={styles.desc}>{vehiculo.descripcion}</Text>
          </View>
        ) : null}

      </ScrollView>

      {/* ── Barra sticky de precio + reservar ── */}
      <View style={styles.stickyBar}>
        <View>
          <Text style={styles.stickyLabel}>Precio por día</Text>
          <Text style={styles.stickyPrice}>${Number(vehiculo.precioDia).toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.reservaBtn, !disponible && styles.reservaBtnDisabled]}
          onPress={() => disponible && nav.navigate('ReservaForm', {
            vehiculoId: vehiculo.id,
            fechaInicio: params.fechaInicio,
            fechaFin: params.fechaFin,
          })}
          disabled={!disponible}
          activeOpacity={0.85}
        >
          <Text style={styles.reservaBtnText}>
            {disponible ? 'Reservar ahora' : 'No disponible'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },

  imgContainer:   { width: '100%', height: 280 },
  img:            { width: '100%', height: 280 },
  imgPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.border },
  imgFallback:    { width: '100%', height: 280, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card },

  imgOverlay:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15,23,42,0.72)', paddingHorizontal: 16, paddingVertical: 12 },
  overlayContent: { flexDirection: 'row', alignItems: 'center' },
  overlayNombre:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  overlayAnio:    { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  placaRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  placaLabel: { color: Colors.muted, fontSize: 13 },
  placaBadge: { backgroundColor: Colors.card, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  placaText:  { color: Colors.text, fontWeight: '700', fontSize: 14, letterSpacing: 1 },

  card:       { backgroundColor: Colors.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16 },
  cardTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },

  specsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  specItem:   { width: '30%', alignItems: 'flex-start' },
  specLabel:  { fontSize: 11, color: Colors.muted, marginBottom: 2 },
  specValue:  { fontSize: 13, color: Colors.text, fontWeight: '600' },

  desc:       { color: Colors.muted, fontSize: 14, lineHeight: 22 },

  stickyBar:          { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28, borderTopWidth: 1, borderTopColor: Colors.border, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.2, shadowRadius: 8 },
  stickyLabel:        { color: Colors.muted, fontSize: 12 },
  stickyPrice:        { color: Colors.primary, fontSize: 28, fontWeight: '800' },
  reservaBtn:         { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  reservaBtnDisabled: { backgroundColor: Colors.border },
  reservaBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
});
