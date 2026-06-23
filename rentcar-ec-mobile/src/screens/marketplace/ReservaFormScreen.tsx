import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Switch,
} from 'react-native';
import { showToast } from '../../components/Toast';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../../constants/colors';
import { vehiculosApi, Vehiculo } from '../../api/vehiculos.api';
import { reservasApi } from '../../api/reservas.api';
import { RootStackParams } from '../../navigation/AppNavigator';
import DatePicker from '../../components/DatePicker';

type Route = RouteProp<RootStackParams, 'ReservaForm'>;
type Nav   = StackNavigationProp<RootStackParams>;

interface Extra  { id: string; nombre: string; precioDia: number }
interface Seguro { id: string; nombre: string; precioDia: number }

function defaultDate(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export default function ReservaFormScreen() {
  const { params } = useRoute<Route>();
  const nav = useNavigation<Nav>();

  const [vehiculo,     setVehiculo]     = useState<Vehiculo | null>(null);
  const [extras,       setExtras]       = useState<Extra[]>([]);
  const [seguros,      setSeguros]      = useState<Seguro[]>([]);
  const [loadingData,  setLoadingData]  = useState(true);
  const [submitting,   setSubmitting]   = useState(false);

  const [fechaInicio,  setFechaInicio]  = useState(params.fechaInicio ?? defaultDate(0));
  const [fechaFin,     setFechaFin]     = useState(params.fechaFin    ?? defaultDate(2));
  const [notas,        setNotas]        = useState('');
  const [seguroId,     setSeguroId]     = useState<string | undefined>();
  const [extrasSelec,  setExtrasSelec]  = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([
      vehiculosApi.getById(params.vehiculoId),
      vehiculosApi.extras(),
      vehiculosApi.seguros(),
    ]).then(([v, ex, seg]) => {
      setVehiculo(v.data.data);
      setExtras((ex.data.data ?? []) as Extra[]);
      setSeguros((seg.data.data ?? []) as Seguro[]);
    }).catch(() => {}).finally(() => setLoadingData(false));
  }, [params.vehiculoId]);

  const diasTotal = (() => {
    if (!fechaInicio || !fechaFin || fechaInicio.length < 10 || fechaFin.length < 10) return 0;
    const diff = new Date(fechaFin).getTime() - new Date(fechaInicio).getTime();
    return Math.max(0, Math.ceil(diff / 86400000));
  })();

  const precioBase   = vehiculo ? Number(vehiculo.precioDia) * diasTotal : 0;
  const precioExtras = extras.reduce((s, e) => s + (extrasSelec[e.id] ?? 0) * Number(e.precioDia), 0);
  const precioSeguro = Number(seguros.find(s => s.id === seguroId)?.precioDia ?? 0);
  const total        = precioBase + precioExtras + precioSeguro;

  const toggleExtra = (id: string) =>
    setExtrasSelec(prev => ({ ...prev, [id]: prev[id] ? 0 : 1 }));

  const handleSubmit = async () => {
    if (!fechaInicio || !fechaFin) {
      showToast({ type: 'warning', title: 'Fechas requeridas', message: 'Selecciona las fechas de inicio y fin' });
      return;
    }
    if (diasTotal <= 0) {
      showToast({ type: 'warning', title: 'Fechas inválidas', message: 'La fecha fin debe ser posterior al inicio' });
      return;
    }

    setSubmitting(true);
    try {
      const extrasPayload = Object.entries(extrasSelec)
        .filter(([, cant]) => cant > 0)
        .map(([extraId, cantidad]) => ({ extraId, cantidad }));

      const { data } = await reservasApi.create({
        vehiculoId: params.vehiculoId,
        fechaInicio, fechaFin,
        seguroId,
        extras: extrasPayload,
        notas: notas || undefined,
      });

      showToast({ type: 'success', title: 'Reserva confirmada', message: `Código: ${data.data.codigoReserva}` });
      nav.replace('ReservaDetail', { reservaId: data.data.id });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Error al crear la reserva';
      showToast({ type: 'error', title: 'No se pudo crear la reserva', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container}>

      {/* Vehículo */}
      {vehiculo && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehículo</Text>
          <Text style={styles.nombreV}>
            {vehiculo.modelo.marca.nombre} {vehiculo.modelo.nombre} {vehiculo.anio}
          </Text>
          <Text style={styles.muted}>${Number(vehiculo.precioDia).toFixed(2)} / día</Text>
        </View>
      )}

      {/* Fechas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fechas de alquiler</Text>
        <View style={styles.datesRow}>
          <DatePicker
            label="📅  Recogida"
            value={fechaInicio}
            onChange={setFechaInicio}
          />
          <View style={styles.dateSep} />
          <DatePicker
            label="🏁  Devolución"
            value={fechaFin}
            onChange={setFechaFin}
            minDate={fechaInicio}
          />
        </View>
        {diasTotal > 0 && (
          <View style={styles.diasBadge}>
            <Text style={styles.diasText}>{diasTotal} día{diasTotal !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Seguros */}
      {seguros.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Seguro (opcional)</Text>
          {seguros.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.optionRow, seguroId === s.id && styles.optionSelected]}
              onPress={() => setSeguroId(prev => prev === s.id ? undefined : s.id)}
            >
              <Text style={styles.optionName}>{s.nombre}</Text>
              <Text style={styles.optionPrice}>${Number(s.precioDia).toFixed(2)}/día</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Extras */}
      {extras.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Extras (opcional)</Text>
          {extras.map(e => (
            <View key={e.id} style={styles.extraRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionName}>{e.nombre}</Text>
                <Text style={styles.muted}>${Number(e.precioDia).toFixed(2)}/día</Text>
              </View>
              <Switch
                value={!!(extrasSelec[e.id] && extrasSelec[e.id] > 0)}
                onValueChange={() => toggleExtra(e.id)}
                thumbColor={Colors.primary}
                trackColor={{ true: Colors.primary + '44', false: Colors.border }}
              />
            </View>
          ))}
        </View>
      )}

      {/* Notas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notas}
          onChangeText={setNotas}
          placeholder="Indicaciones especiales..."
          placeholderTextColor={Colors.muted}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Resumen */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Resumen de precio</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>
            Alquiler{diasTotal > 0 ? ` (${diasTotal} día${diasTotal !== 1 ? 's' : ''})` : ''}
          </Text>
          <Text style={styles.summaryVal}>${precioBase.toFixed(2)}</Text>
        </View>
        {precioExtras > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Extras</Text>
            <Text style={styles.summaryVal}>${precioExtras.toFixed(2)}</Text>
          </View>
        )}
        {precioSeguro > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Seguro</Text>
            <Text style={styles.summaryVal}>${precioSeguro.toFixed(2)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalVal}>${total.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, (submitting || diasTotal <= 0) && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={submitting || diasTotal <= 0}
      >
        <Text style={styles.btnText}>{submitting ? 'Creando reserva…' : 'Confirmar reserva'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg:             { flex: 1, backgroundColor: Colors.bg },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  container:      { padding: 16, paddingBottom: 32 },
  card:           { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle:      { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  nombreV:        { fontSize: 16, fontWeight: '700', color: Colors.text },
  muted:          { color: Colors.muted, fontSize: 13 },
  label:          { color: Colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:          { backgroundColor: Colors.bg, color: Colors.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: Colors.border, fontSize: 14, marginBottom: 12 },
  textarea:       { minHeight: 72, textAlignVertical: 'top' },

  // Fechas lado a lado
  datesRow:       { flexDirection: 'row', alignItems: 'flex-start' },
  dateCol:        { flex: 1 },
  dateSep:        { width: 1, backgroundColor: Colors.border, marginHorizontal: 14, marginTop: 18, height: 36 },
  dateInput:      { color: Colors.text, fontSize: 16, fontWeight: '700', padding: 0, marginTop: 4 },
  diasBadge:      { marginTop: 12, backgroundColor: `${Colors.primary}22`, borderRadius: 20, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4 },
  diasText:       { color: Colors.primary, fontSize: 13, fontWeight: '700' },

  optionRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  optionName:     { color: Colors.text, fontSize: 14, fontWeight: '600' },
  optionPrice:    { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  extraRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },

  summary:        { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryTitle:   { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryVal:     { color: Colors.text, fontWeight: '600', fontSize: 14 },
  totalRow:       { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4 },
  totalLabel:     { color: Colors.text, fontSize: 16, fontWeight: '800' },
  totalVal:       { color: Colors.primary, fontSize: 22, fontWeight: '800' },

  btn:            { backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled:    { opacity: 0.5 },
  btnText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
});
