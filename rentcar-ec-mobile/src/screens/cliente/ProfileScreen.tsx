import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
} from 'react-native';
import { showToast } from '../../components/Toast';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth.api';

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuth();
  const [nombres,   setNombres]   = useState(user?.nombres  ?? '');
  const [apellidos, setApellidos] = useState(user?.apellidos ?? '');
  const [telefono,  setTelefono]  = useState(user?.telefono  ?? '');
  const [saving,    setSaving]    = useState(false);

  const initials = `${user?.nombres?.[0] ?? ''}${user?.apellidos?.[0] ?? ''}`.toUpperCase() || '?';

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await authApi.updateMe({ nombres, apellidos, telefono: telefono || undefined });
      setUser(data.data);
      showToast({ type: 'success', title: 'Perfil actualizado' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'No se pudo actualizar', message: err?.response?.data?.error?.message });
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Avatar ── */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.nombres} {user?.apellidos}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      {/* ── Editar perfil ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Editar perfil</Text>

        <View style={styles.nameRow}>
          <View style={styles.half}>
            <Text style={styles.label}>Nombres</Text>
            <TextInput
              style={styles.input}
              value={nombres}
              onChangeText={setNombres}
              placeholder="Juan"
              placeholderTextColor={Colors.muted}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Apellidos</Text>
            <TextInput
              style={styles.input}
              value={apellidos}
              onChangeText={setApellidos}
              placeholder="Pérez"
              placeholderTextColor={Colors.muted}
              autoCapitalize="words"
            />
          </View>
        </View>

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={telefono}
          onChangeText={setTelefono}
          placeholder="+593 9X XXX XXXX"
          placeholderTextColor={Colors.muted}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnOff]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Info cuenta ── */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Información de cuenta</Text>
        <InfoRow iconName="mail-outline"     label="Email" value={user?.email ?? '—'} />
        <InfoRow iconName="pricetag-outline" label="Rol"   value={user?.role  ?? '—'} last />
      </View>

      {/* ── Cerrar sesión ── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={18} color={Colors.danger} style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>RentCar Ec  ·  v1.0  ·  Ecuador</Text>
    </ScrollView>
  );
}

function InfoRow({
  iconName, label, value, last,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[ir.row, !last && ir.border]}>
      <Ionicons name={iconName} size={20} color={Colors.muted} style={ir.icon} />
      <View>
        <Text style={ir.label}>{label}</Text>
        <Text style={ir.value}>{value}</Text>
      </View>
    </View>
  );
}

const ir = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  border:{ borderBottomWidth: 1, borderBottomColor: Colors.border },
  icon:  { marginRight: 12, width: 28, textAlign: 'center' },
  label: { fontSize: 11, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 14, color: Colors.text, fontWeight: '600', marginTop: 2 },
});

const styles = StyleSheet.create({
  bg:            { flex: 1, backgroundColor: Colors.bg },
  container:     { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  avatar:        { width: 82, height: 82, borderRadius: 41, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  avatarText:    { fontSize: 30, fontWeight: '900', color: '#fff' },
  name:          { fontSize: 20, fontWeight: '800', color: Colors.text },
  email:         { fontSize: 13, color: Colors.muted, marginTop: 3, marginBottom: 10 },
  rolePill:      { backgroundColor: `${Colors.primary}22`, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  roleText:      { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  card:          { backgroundColor: Colors.card, borderRadius: 18, padding: 20, marginBottom: 14 },
  infoCard:      { backgroundColor: Colors.card, borderRadius: 18, padding: 20, marginBottom: 14 },
  cardTitle:     { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  nameRow:       { flexDirection: 'row', gap: 12 },
  half:          { flex: 1 },
  label:         { fontSize: 11, color: Colors.muted, fontWeight: '600', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:         { backgroundColor: Colors.bg, color: Colors.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  saveBtn:       { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 2 },
  btnOff:        { opacity: 0.6 },
  saveBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 14, paddingVertical: 14, marginBottom: 20 },
  logoutText:    { color: Colors.danger, fontWeight: '700', fontSize: 15 },
  version:       { textAlign: 'center', color: Colors.border, fontSize: 11 },
});
