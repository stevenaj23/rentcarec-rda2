import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import StatusBadge from './StatusBadge';
import { Vehiculo } from '../api/vehiculos.api';
import { imgSource } from '../utils/imageUrl';

interface Props {
  vehiculo: Vehiculo;
  onPress: () => void;
  diasTotal?: number;
}

export default function VehiculoCard({ vehiculo, onPress, diasTotal }: Props) {
  const nombre = `${vehiculo.modelo.marca.nombre} ${vehiculo.modelo.nombre}`;
  const total  = diasTotal ? (vehiculo.precioDia * diasTotal).toFixed(2) : null;
  const [err, setErr]      = React.useState(false);
  const [loading, setLoad] = React.useState(true);
  const src = imgSource(vehiculo.imagenUrl);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>

      {/* ── Imagen ── */}
      <View style={styles.imgWrap}>
        {src && !err ? (
          <>
            {loading && (
              <View style={styles.imgSkeleton}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            )}
            <Image
              source={src}
              style={styles.img}
              resizeMode="cover"
              onLoad={() => setLoad(false)}
              onError={() => { setErr(true); setLoad(false); }}
            />
          </>
        ) : (
          <View style={styles.imgFallback}>
            <Ionicons name="car-sport" size={56} color={Colors.border} />
          </View>
        )}

        {/* Overlay gradiente en la imagen */}
        <View style={styles.imgOverlay} />

        {/* Año en esquina inferior izq de la imagen */}
        <View style={styles.anioWrap}>
          <Text style={styles.anioText}>{vehiculo.anio}</Text>
        </View>

        {/* Badge status en esquina superior derecha */}
        <View style={styles.badgeWrap}>
          <StatusBadge status={vehiculo.status} />
        </View>
      </View>

      {/* ── Cuerpo ── */}
      <View style={styles.body}>

        {/* Nombre */}
        <Text style={styles.nombre} numberOfLines={1}>{nombre}</Text>

        {/* Specs con iconos */}
        <View style={styles.specsRow}>
          <SpecChip icon="pricetag-outline"  label={vehiculo.categoria.nombre} />
          <SpecChip icon="flame-outline"     label={vehiculo.tipoCombustible.nombre} />
          <SpecChip icon="settings-outline"  label={vehiculo.tipoTransmision.nombre} />
          <SpecChip icon="people-outline"    label={`${vehiculo.numeroPasajeros}p`} />
        </View>

        {/* Precio */}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>Precio por día</Text>
            <Text style={styles.price}>
              ${Number(vehiculo.precioDia).toFixed(2)}
              <Text style={styles.priceUnit}> /día</Text>
            </Text>
          </View>
          {total ? (
            <View style={styles.totalBadge}>
              <Ionicons name="wallet-outline" size={12} color={Colors.primary} />
              <Text style={styles.totalText}> ${total} total</Text>
            </View>
          ) : (
            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SpecChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={spec.chip}>
      <Ionicons name={icon} size={11} color={Colors.muted} />
      <Text style={spec.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const spec = StyleSheet.create({
  chip:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginRight: 6, marginBottom: 6 },
  label: { color: Colors.muted, fontSize: 11, fontWeight: '500', maxWidth: 70 },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Imagen
  imgWrap:    { width: '100%', height: 185, position: 'relative' },
  img:        { width: '100%', height: 185 },
  imgSkeleton:{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card },
  imgFallback:{ width: '100%', height: 185, alignItems: 'center', justifyContent: 'center', backgroundColor: `${Colors.border}55` },
  imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'rgba(15,23,42,0.45)' },
  badgeWrap:  { position: 'absolute', top: 10, right: 10 },
  anioWrap:   { position: 'absolute', bottom: 8, left: 12 },
  anioText:   { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },

  // Cuerpo
  body:      { padding: 14 },
  nombre:    { color: Colors.text, fontWeight: '800', fontSize: 16, marginBottom: 8 },

  // Specs
  specsRow:  { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },

  // Precio
  priceRow:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  priceLabel: { color: Colors.muted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  price:      { color: Colors.primary, fontWeight: '800', fontSize: 22 },
  priceUnit:  { color: Colors.muted, fontWeight: '400', fontSize: 13 },
  totalBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${Colors.primary}20`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${Colors.primary}40` },
  totalText:  { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  chevronWrap:{ backgroundColor: `${Colors.primary}15`, borderRadius: 10, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
