import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { showToast } from '../../components/Toast';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth.api';
import { saveToken } from '../../api/client';
import { Colors } from '../../constants/colors';
import { RootStackParams } from '../../navigation/AppNavigator';
import BrandLogo from '../../components/BrandLogo';

type Nav = StackNavigationProp<RootStackParams>;

export default function RegisterScreen() {
  const nav = useNavigation<Nav>();
  const { setUser } = useAuth();

  const [nombres,   setNombres]   = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email,     setEmail]     = useState('');
  const [telefono,  setTelefono]  = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [loading,   setLoading]   = useState(false);

  const passMatch = confirm === '' || confirm === password;

  const handleRegister = async () => {
    if (!nombres.trim() || !apellidos.trim() || !email.trim() || !password) {
      showToast({ type: 'warning', title: 'Campos requeridos', message: 'Completa todos los campos obligatorios' });
      return;
    }
    if (password !== confirm) {
      showToast({ type: 'warning', title: 'Contraseñas no coinciden', message: 'Verifica que ambas contraseñas sean iguales' });
      return;
    }
    if (password.length < 6) {
      showToast({ type: 'warning', title: 'Contraseña muy corta', message: 'Debe tener al menos 6 caracteres' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.register({
        nombres:   nombres.trim(),
        apellidos: apellidos.trim(),
        email:     email.trim().toLowerCase(),
        password,
        telefono:  telefono.trim() || undefined,
      });
      await saveToken(data.data.token);
      setUser(data.data.user);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error de registro',
        message: err?.response?.data?.error?.message ?? 'Error al crear la cuenta',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Logo ── */}
        <View style={styles.logoSection}>
          <BrandLogo size="md" showTagline={false} />
          <Text style={styles.tagline}>Crea tu cuenta de cliente</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          <View style={styles.cardAccent} />

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Registro</Text>

            {/* Nombres + Apellidos */}
            <View style={styles.row}>
              <View style={styles.half}>
                <FieldLabel text="Nombres *" />
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={16} color={Colors.muted} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={nombres}
                    onChangeText={setNombres}
                    placeholder="Juan"
                    placeholderTextColor={Colors.muted}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <View style={styles.half}>
                <FieldLabel text="Apellidos *" />
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={16} color={Colors.muted} style={styles.icon} />
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
            </View>

            {/* Email */}
            <FieldLabel text="Email *" />
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={16} color={Colors.muted} style={styles.icon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor={Colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Teléfono */}
            <FieldLabel text="Teléfono" />
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={16} color={Colors.muted} style={styles.icon} />
              <TextInput
                style={styles.input}
                value={telefono}
                onChangeText={setTelefono}
                placeholder="+593 9X XXX XXXX"
                placeholderTextColor={Colors.muted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Contraseña */}
            <FieldLabel text="Contraseña *" />
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={Colors.muted} style={styles.icon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={Colors.muted}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Confirmar */}
            <FieldLabel text="Confirmar contraseña *" />
            <View style={[styles.inputWrap, !passMatch && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={16} color={passMatch ? Colors.muted : Colors.danger} style={styles.icon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repite la contraseña"
                placeholderTextColor={Colors.muted}
                secureTextEntry={!showConf}
              />
              <TouchableOpacity onPress={() => setShowConf(p => !p)} style={styles.eyeBtn}>
                <Ionicons name={showConf ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.muted} />
              </TouchableOpacity>
            </View>
            {!passMatch && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                <Text style={styles.errorText}> Las contraseñas no coinciden</Text>
              </View>
            )}

            {/* Botón */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnOff]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <Text style={styles.btnText}>Creando cuenta…</Text>
              ) : (
                <View style={styles.btnInner}>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>  Crear cuenta</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Ir a login ── */}
        <TouchableOpacity style={styles.loginLink} onPress={() => nav.navigate('Login')}>
          <Text style={styles.loginText}>
            ¿Ya tienes cuenta?{'  '}
            <Text style={styles.loginBold}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: Colors.bg },
  scroll:     { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },

  logoSection:{ alignItems: 'center', marginBottom: 24 },
  tagline:    { color: Colors.muted, fontSize: 13, marginTop: 8 },

  card:       { backgroundColor: Colors.card, borderRadius: 22, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  cardAccent: { height: 4, backgroundColor: Colors.primary },
  cardBody:   { padding: 22 },
  cardTitle:  { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 20 },

  row:        { flexDirection: 'row', gap: 10, marginBottom: 0 },
  half:       { flex: 1 },

  label:      { fontSize: 11, color: Colors.muted, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  inputWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  inputError: { borderColor: Colors.danger },
  icon:       { paddingLeft: 12, paddingRight: 2 },
  input:      { color: Colors.text, paddingHorizontal: 8, paddingVertical: 12, fontSize: 14 },
  eyeBtn:     { paddingHorizontal: 12, paddingVertical: 12 },

  errorRow:   { flexDirection: 'row', alignItems: 'center', marginTop: -10, marginBottom: 10 },
  errorText:  { color: Colors.danger, fontSize: 12 },

  btn:        { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  btnOff:     { opacity: 0.6 },
  btnInner:   { flexDirection: 'row', alignItems: 'center' },
  btnText:    { color: '#fff', fontWeight: '700', fontSize: 16 },

  loginLink:  { alignItems: 'center', marginTop: 4 },
  loginText:  { color: Colors.muted, fontSize: 14 },
  loginBold:  { color: Colors.primary, fontWeight: '700' },
});
