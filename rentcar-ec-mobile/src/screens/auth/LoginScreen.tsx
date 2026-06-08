import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { RootStackParams } from '../../navigation/AppNavigator';
import { getCurrentServerUrl, saveServerUrl } from '../../api/client';
import BrandLogo from '../../components/BrandLogo';

type Nav = StackNavigationProp<RootStackParams>;

export default function LoginScreen() {
  const nav = useNavigation<Nav>();
  const { login } = useAuth();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [serverUrl,  setServerUrl]  = useState(getCurrentServerUrl);

  const handleSaveServer = async () => {
    if (!serverUrl.startsWith('http')) { Alert.alert('URL inválida', 'Debe comenzar con http://'); return; }
    await saveServerUrl(serverUrl);
    setShowServer(false);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) { Alert.alert('Campos requeridos', 'Ingresa tu email y contraseña'); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const isNetwork = !err?.response;
      const msg = isNetwork
        ? 'El servidor tardó en responder. Vuelve a intentarlo.'
        : (err?.response?.data?.error?.message ?? 'Credenciales inválidas');
      Alert.alert(isNetwork ? 'Sin respuesta' : 'Acceso denegado', msg);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Logo ── */}
        <View style={styles.logoSection}>
          <BrandLogo size="lg" showTagline />
          <Text style={styles.tagline}>Marketplace de alquiler en Ecuador</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          {/* Acento superior */}
          <View style={styles.cardAccent} />

          <Text style={styles.cardTitle}>Bienvenido de vuelta</Text>
          <Text style={styles.cardSub}>Inicia sesión para continuar</Text>

          {/* Email */}
          <Text style={styles.label}>Correo electrónico</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={Colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          {/* Contraseña */}
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.muted} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.muted}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Botón */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnOff]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <Text style={styles.btnText}>Ingresando…</Text>
            ) : (
              <View style={styles.btnInner}>
                <Text style={styles.btnText}>Ingresar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Registro ── */}
        <TouchableOpacity style={styles.link} onPress={() => nav.navigate('Register')}>
          <Text style={styles.linkText}>
            ¿No tienes cuenta?{'  '}
            <Text style={styles.linkBold}>Regístrate aquí</Text>
          </Text>
        </TouchableOpacity>

        {/* ── Servidor ── */}
        <TouchableOpacity
          style={styles.serverBtn}
          onPress={() => { setServerUrl(getCurrentServerUrl()); setShowServer(true); }}
        >
          <Ionicons name="server-outline" size={13} color={Colors.border} />
          <Text style={styles.serverText}>  Configurar servidor</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>© 2026 RentCar Ecuador</Text>
      </ScrollView>

      {/* Modal servidor */}
      <Modal visible={showServer} transparent animationType="fade" onRequestClose={() => setShowServer(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Ionicons name="server-outline" size={22} color={Colors.primary} />
              <Text style={styles.modalTitle}>  URL del servidor</Text>
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="link-outline" size={18} color={Colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="https://..."
                placeholderTextColor={Colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleSaveServer}>
              <Text style={styles.btnText}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowServer(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: Colors.bg },
  scroll:      { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoSection: { alignItems: 'center', marginBottom: 32 },
  tagline:     { color: Colors.muted, fontSize: 13, marginTop: 8, textAlign: 'center' },

  card:        { backgroundColor: Colors.card, borderRadius: 22, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  cardAccent:  { height: 4, backgroundColor: Colors.primary, marginBottom: 24 },
  cardTitle:   { fontSize: 22, fontWeight: '800', color: Colors.text, paddingHorizontal: 24 },
  cardSub:     { fontSize: 13, color: Colors.muted, paddingHorizontal: 24, marginTop: 4, marginBottom: 24 },

  label:       { fontSize: 11, color: Colors.muted, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 24 },

  inputWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 18, marginHorizontal: 24 },
  inputIcon:   { paddingLeft: 14, paddingRight: 4 },
  textInput:   { flex: 1, color: Colors.text, paddingHorizontal: 10, paddingVertical: 13, fontSize: 15 },
  eyeBtn:      { paddingHorizontal: 14, paddingVertical: 13 },

  btn:         { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginHorizontal: 24, marginBottom: 24 },
  btnOff:      { opacity: 0.6 },
  btnInner:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },

  link:        { alignItems: 'center', marginBottom: 16 },
  linkText:    { color: Colors.muted, fontSize: 14 },
  linkBold:    { color: Colors.primary, fontWeight: '700' },

  serverBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  serverText:  { color: Colors.border, fontSize: 12 },
  footer:      { textAlign: 'center', color: Colors.border, fontSize: 11, marginBottom: 8 },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  modal:       { backgroundColor: Colors.card, borderRadius: 22, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 16, fontWeight: '700', color: Colors.text },
  cancelBtn:   { alignItems: 'center', paddingVertical: 12 },
  cancelText:  { color: Colors.muted, fontWeight: '600', fontSize: 14 },
});
