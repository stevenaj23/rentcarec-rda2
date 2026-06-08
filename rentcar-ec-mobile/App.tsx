import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { loadSavedServerUrl } from './src/api/client';
import Toast, { toastRef } from './src/components/Toast';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSavedServerUrl().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <View style={styles.root}>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AuthProvider>
      <Toast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
