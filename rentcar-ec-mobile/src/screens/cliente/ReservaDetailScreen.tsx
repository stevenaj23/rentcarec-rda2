import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { showToast } from '../../components/Toast';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { reservasApi, Reserva } from '../../api/reservas.api';
import { pagosApi, Factura } from '../../api/pagos.api';
import StatusBadge from '../../components/StatusBadge';
import { RootStackParams } from '../../navigation/AppNavigator';

type Route = RouteProp<RootStackParams, 'ReservaDetail'>;
type Nav   = StackNavigationProp<RootStackParams>;

const METODOS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'EFECTIVO',        label: 'Efectivo',          icon: 'cash-outline' },
  { key: 'TARJETA_CREDITO', label: 'Tarjeta de crédito',icon: 'card-outline' },
  { key: 'TARJETA_DEBITO',  label: 'Tarjeta de débito', icon: 'card-outline' },
  { key: 'TRANSFERENCIA',   label: 'Transferencia',      icon: 'business-outline' },
] as const;

export default function ReservaDetailScreen() {
  const { params } = useRoute<Route>();
  const navigation  = useNavigation<Nav>();
  const [reserva,    setReserva]    = useState<Reserva | null>(null);
  const [factura,    setFactura]    = useState<Factura | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [canceling,  setCanceling]  = useState(false);
  const [payModal,   setPayModal]   = useState(false);
  const [factModal,  setFactModal]  = useState(false);
  const [metodo,     setMetodo]     = useState<string>('TARJETA_CREDITO');
  const [referencia, setReferencia] = useState('');
  const [ruc,        setRuc]        = useState('');
  const [razon,      setRazon]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [resRes, factRes] = await Promise.all([
        reservasApi.getById(params.reservaId),
        pagosApi.getFacturaByReserva(params.reservaId).catch(() => null),
      ]);
      setReserva(resRes.data.data);
      setFactura(factRes?.data?.data?.[0] ?? null);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [params.reservaId]);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
  );
  if (!reserva) return (
    <View style={styles.center}><Text style={{ color: Colors.muted }}>Reserva no encontrada</Text></View>
  );

  const pagos      = reserva.pagos ?? [];
  const pagoOk     = pagos.some(p => p.status === 'COMPLETADO');
  const canCancel  = ['PENDIENTE', 'CONFIRMADA'].includes(reserva.status) && !factura;
  const canPay     = ['PENDIENTE', 'CONFIRMADA'].includes(reserva.status) && !pagoOk;
  const canFactura = pagoOk && !factura && reserva.status !== 'CANCELADA';

  const handleCancel = () => {
    Alert.alert('Cancelar reserva', '¿Estás seguro? Esta acción no se puede deshacer.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar', style: 'destructive', onPress: async () => {
          setCanceling(true);
          try {
            await reservasApi.cancel(params.reservaId);
            (navigation as any).navigate('Main', { screen: 'SearchTab' });
          } catch (err: any) {
            showToast({ type: 'error', title: 'No se pudo cancelar', message: err?.response?.data?.error?.message });
          } finally { setCanceling(false); }
        },
      },
    ]);
  };

  const handlePago = async () => {
    if (!reserva) return;
    setSubmitting(true);
    try {
      await pagosApi.pagar({
        reservaId: reserva.id,
        monto:     Number(reserva.totalAmount),
        metodoPago: metodo,
        referencia: referencia || undefined,
      });
      setPayModal(false);
      showToast({ type: 'success', title: 'Pago registrado', message: 'Puedes generar tu factura.' });
      await load();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error al procesar el pago', message: err?.response?.data?.error?.message });
    } finally { setSubmitting(false); }
  };

  const handleFactura = async () => {
    if (!ruc.trim() || !razon.trim()) { showToast({ type: 'warning', title: 'Campos requeridos', message: 'Ingresa RUC/Cédula y razón social' }); return; }
    setSubmitting(true);
    try {
      const { data } = await pagosApi.generarFactura({ reservaId: reserva.id, rucCliente: ruc.trim(), razonSocial: razon.trim() });
      setFactura(data.data);
      setFactModal(false);
      showToast({ type: 'success', title: 'Factura generada', message: `N° ${data.data.numeroFactura}` });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error al generar factura', message: err?.response?.data?.error?.message });
    } finally { setSubmitting(false); }
  };

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container}>

      {/* ── Encabezado ── */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.codigo}>{reserva.codigoReserva}</Text>
            <Text style={styles.muted}>Creada {reserva.createdAt.slice(0, 10)}</Text>
          </View>
          <StatusBadge status={reserva.status} />
        </View>
      </View>

      {/* ── Vehículo ── */}
      {reserva.vehiculo && (
        <View style={styles.card}>
          <CardTitle icon="car-sport-outline" label="Vehículo" />
          <Text style={styles.vehiculoNombre}>{reserva.vehiculo.nombre}</Text>
          <View style={styles.vehiculoMeta}>
            {reserva.vehiculo.placa && (
              <View style={styles.placaBadge}>
                <Text style={styles.placaText}>{reserva.vehiculo.placa}</Text>
              </View>
            )}
            {reserva.vehiculo.categoria && (
              <Text style={styles.categoriaText}>{reserva.vehiculo.categoria}</Text>
            )}
          </View>
          <Text style={styles.precioDia}>${Number(reserva.vehiculo.precio_dia).toFixed(2)} / día</Text>
        </View>
      )}

      {/* ── Fechas ── */}
      <View style={styles.card}>
        <CardTitle icon="calendar-outline" label="Período de alquiler" />
        <View style={styles.datesRow}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Recogida</Text>
            <Text style={styles.dateVal}>{reserva.fechaInicio.slice(0, 10)}</Text>
          </View>
          <View style={styles.datesCenter}>
            <Text style={styles.daysChip}>{reserva.diasTotal} día{reserva.diasTotal !== 1 ? 's' : ''}</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.muted} />
          </View>
          <View style={[styles.dateBlock, { alignItems: 'flex-end' }]}>
            <Text style={styles.dateLabel}>Devolución</Text>
            <Text style={styles.dateVal}>{reserva.fechaFin.slice(0, 10)}</Text>
          </View>
        </View>
      </View>

      {/* ── Seguro ── */}
      {reserva.seguro && (
        <View style={styles.card}>
          <CardTitle icon="shield-checkmark-outline" label="Seguro" />
          <Row label={reserva.seguro.nombre} val={`$${Number(reserva.seguro.precioDia).toFixed(2)}/día`} />
        </View>
      )}

      {/* ── Extras ── */}
      {(reserva.extras ?? []).length > 0 && (
        <View style={styles.card}>
          <CardTitle icon="add-circle-outline" label="Extras" />
          {(reserva.extras ?? []).map((e, i) => (
            <Row key={i} label={`× ${e.cantidad}`} val={`$${Number(e.subtotal).toFixed(2)}`} />
          ))}
        </View>
      )}

      {/* ── Desglose de precio ── */}
      <View style={styles.card}>
        <CardTitle icon="wallet-outline" label="Desglose de precio" />
        <Row label={`Alquiler (${reserva.diasTotal} días)`} val={`$${Number(reserva.precioBase).toFixed(2)}`} />
        {Number(reserva.precioExtras) > 0 && <Row label="Extras"  val={`$${Number(reserva.precioExtras).toFixed(2)}`} />}
        {Number(reserva.precioSeguro) > 0 && <Row label="Seguro"  val={`$${Number(reserva.precioSeguro).toFixed(2)}`} />}
        <View style={styles.divider} />
        <Row label="Total" val={`$${Number(reserva.totalAmount).toFixed(2)}`} highlight />
      </View>

      {/* ── Pagos ── */}
      {pagos.length > 0 && (
        <View style={styles.card}>
          <CardTitle icon="card-outline" label="Pagos" />
          {pagos.map(p => (
            <View key={p.id} style={styles.pagoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pagoMetodo}>{p.metodoPago.replace(/_/g, ' ')}</Text>
                {p.referencia && <Text style={styles.pagoRef}>Ref: {p.referencia}</Text>}
                <Text style={styles.pagoDate}>{p.createdAt.slice(0, 10)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.pagoMonto}>${Number(p.monto).toFixed(2)}</Text>
                <View style={[styles.pagoStatusBadge, p.status === 'COMPLETADO' && styles.pagoStatusOk]}>
                  <Text style={styles.pagoStatusTxt}>{p.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Factura ── */}
      {factura && (
        <View style={styles.card}>
          <CardTitle icon="receipt-outline" label="Factura" />
          <Row label="N° Factura"  val={factura.numeroFactura} />
          {factura.rucCliente  && <Row label="RUC"          val={factura.rucCliente} />}
          {factura.razonSocial && <Row label="Razón social" val={factura.razonSocial} />}
          <View style={styles.divider} />
          <Row label="Subtotal" val={`$${Number(factura.subtotal).toFixed(2)}`} />
          <Row label="IVA 15%"  val={`$${Number(factura.iva).toFixed(2)}`} />
          <Row label="Total"    val={`$${Number(factura.total).toFixed(2)}`} highlight />
        </View>
      )}

      {/* ── Notas ── */}
      {reserva.notas ? (
        <View style={styles.card}>
          <CardTitle icon="document-text-outline" label="Notas" />
          <Text style={styles.muted}>{reserva.notas}</Text>
        </View>
      ) : null}

      {/* ── Acciones ── */}
      {canPay && (
        <TouchableOpacity style={styles.payBtn} onPress={() => setPayModal(true)} activeOpacity={0.85}>
          <Ionicons name="card-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.payBtnText}>Registrar pago</Text>
        </TouchableOpacity>
      )}
      {canFactura && (
        <TouchableOpacity style={styles.outlineBtn} onPress={() => setFactModal(true)} activeOpacity={0.85}>
          <Ionicons name="receipt-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.outlineBtnText}>Generar factura</Text>
        </TouchableOpacity>
      )}
      {canCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={canceling} activeOpacity={0.85}>
          <Text style={styles.cancelBtnText}>{canceling ? 'Cancelando…' : 'Cancelar reserva'}</Text>
        </TouchableOpacity>
      )}

      {/* ── Modal Pago ── */}
      <Modal visible={payModal} transparent animationType="slide" onRequestClose={() => setPayModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Registrar pago</Text>
            <Text style={styles.modalAmount}>${Number(reserva.totalAmount).toFixed(2)}</Text>

            <Text style={styles.modalLabel}>Método de pago</Text>
            {METODOS.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.optionRow, metodo === m.key && styles.optionSel]}
                onPress={() => setMetodo(m.key)}
              >
                <Ionicons name={m.icon} size={18} color={metodo === m.key ? Colors.primary : Colors.muted} style={{ marginRight: 10 }} />
                <Text style={[styles.optionTxt, metodo === m.key && { color: Colors.primary }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.modalLabel}>Referencia (opcional)</Text>
            <TextInput
              style={styles.input}
              value={referencia}
              onChangeText={setReferencia}
              placeholder="N° transacción, comprobante..."
              placeholderTextColor={Colors.muted}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPayModal(false)}>
                <Text style={styles.modalCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, submitting && styles.btnDisabled]}
                onPress={handlePago} disabled={submitting}
              >
                <Text style={styles.modalConfirmTxt}>{submitting ? 'Procesando…' : 'Confirmar pago'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal Factura ── */}
      <Modal visible={factModal} transparent animationType="slide" onRequestClose={() => setFactModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Generar factura</Text>
            <Text style={styles.modalLabel}>RUC / Cédula</Text>
            <TextInput
              style={styles.input}
              value={ruc}
              onChangeText={setRuc}
              placeholder="0000000000001"
              placeholderTextColor={Colors.muted}
              keyboardType="numeric"
              maxLength={13}
            />
            <Text style={styles.modalLabel}>Razón social</Text>
            <TextInput
              style={styles.input}
              value={razon}
              onChangeText={setRazon}
              placeholder="Tu nombre o empresa"
              placeholderTextColor={Colors.muted}
              autoCapitalize="words"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setFactModal(false)}>
                <Text style={styles.modalCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, submitting && styles.btnDisabled]}
                onPress={handleFactura} disabled={submitting}
              >
                <Text style={styles.modalConfirmTxt}>{submitting ? 'Generando…' : 'Generar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

function CardTitle({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

function Row({ label, val, highlight }: { label: string; val: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ color: Colors.muted, fontSize: 14, flex: 1 }}>{label}</Text>
      <Text style={{ color: highlight ? Colors.primary : Colors.text, fontWeight: highlight ? '800' : '600', fontSize: highlight ? 17 : 14 }}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg:              { flex: 1, backgroundColor: Colors.bg },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  container:       { padding: 16, paddingBottom: 40 },

  card:            { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 12 },

  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  codigo:          { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  muted:           { color: Colors.muted, fontSize: 13 },

  vehiculoNombre:  { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  vehiculoMeta:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  placaBadge:      { backgroundColor: Colors.bg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  placaText:       { color: Colors.text, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  categoriaText:   { color: Colors.muted, fontSize: 12, fontWeight: '600' },
  precioDia:       { color: Colors.primary, fontSize: 15, fontWeight: '700' },

  datesRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 12, padding: 12 },
  dateBlock:       { flex: 1 },
  dateLabel:       { fontSize: 10, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  dateVal:         { fontSize: 15, fontWeight: '700', color: Colors.text },
  datesCenter:     { alignItems: 'center', paddingHorizontal: 12 },
  daysChip:        { backgroundColor: `${Colors.primary}22`, color: Colors.primary, fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 4 },

  divider:         { borderTopWidth: 1, borderTopColor: Colors.border, marginVertical: 10 },

  pagoRow:         { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.bg, borderRadius: 10, padding: 12, marginBottom: 8 },
  pagoMetodo:      { color: Colors.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  pagoRef:         { color: Colors.muted, fontSize: 12 },
  pagoDate:        { color: Colors.muted, fontSize: 11, marginTop: 2 },
  pagoMonto:       { color: Colors.primary, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  pagoStatusBadge: { backgroundColor: Colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  pagoStatusOk:    { backgroundColor: '#16a34a33' },
  pagoStatusTxt:   { fontSize: 10, fontWeight: '700', color: Colors.text },

  payBtn:          { backgroundColor: Colors.primary, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  payBtnText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
  outlineBtn:      { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  outlineBtnText:  { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  cancelBtn:       { borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10 },
  cancelBtnText:   { color: '#EF4444', fontWeight: '700', fontSize: 15 },

  overlay:         { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modal:           { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle:      { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  modalAmount:     { fontSize: 30, fontWeight: '800', color: Colors.primary, marginBottom: 18 },
  modalLabel:      { color: Colors.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 },
  optionRow:       { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 6 },
  optionSel:       { borderColor: Colors.primary, backgroundColor: `${Colors.primary}18` },
  optionTxt:       { color: Colors.text, fontWeight: '600', fontSize: 14 },
  input:           { backgroundColor: Colors.bg, color: Colors.text, borderRadius: 10, padding: 13, borderWidth: 1, borderColor: Colors.border, fontSize: 14, marginBottom: 8 },
  modalBtns:       { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn:  { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelTxt:  { color: Colors.muted, fontWeight: '700' },
  modalConfirmBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  modalConfirmTxt: { color: '#fff', fontWeight: '700' },
  btnDisabled:     { opacity: 0.5 },
});
