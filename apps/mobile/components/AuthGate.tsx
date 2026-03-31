import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@alpha-stocks/core';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, signInWithGoogle } = useAuth();
  const [biometricLocked, setBiometricLocked] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);
  const wasBackground = useRef(false);

  // Check biometric availability and stored preference
  useEffect(() => {
    if (!user) {
      setBiometricChecked(true);
      return;
    }

    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const available = hasHardware && isEnrolled;
      setBiometricAvailable(available);

      if (!available) {
        setBiometricLocked(false);
        setBiometricChecked(true);
        return;
      }

      const stored = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      if (stored === null) {
        // First time with biometric hardware — auto-enable
        await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
        setBiometricChecked(true);
        return;
      }

      if (stored !== 'true') {
        setBiometricLocked(false);
      }
      setBiometricChecked(true);
    })();
  }, [user]);

  // Prompt for biometric
  const authenticate = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Alpha Stocks',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });
    if (result.success) {
      setBiometricLocked(false);
    }
  }, []);

  // Auto-prompt when biometric check is done and still locked
  useEffect(() => {
    if (biometricChecked && user && biometricLocked && biometricAvailable) {
      authenticate();
    }
  }, [biometricChecked, user, biometricLocked, biometricAvailable, authenticate]);

  // Re-lock when app returns from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        wasBackground.current = true;
      } else if (state === 'active' && wasBackground.current) {
        wasBackground.current = false;
        const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
        if (enabled === 'true' && biometricAvailable) {
          setBiometricLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, [biometricAvailable]);

  // Auto-prompt after re-lock from background
  useEffect(() => {
    if (biometricLocked && biometricAvailable && biometricChecked && user) {
      authenticate();
    }
  }, [biometricLocked, biometricAvailable, biometricChecked, user, authenticate]);

  if (isLoading || !biometricChecked) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Alpha Stocks</Text>
        <Text style={styles.subtitle}>Personal portfolio tracker and stock analyzer</Text>
        <TouchableOpacity style={styles.button} onPress={signInWithGoogle}>
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (biometricLocked) {
    return (
      <View style={styles.center}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>Alpha Stocks</Text>
        <Text style={styles.subtitle}>Authenticate to continue</Text>
        <TouchableOpacity style={styles.button} onPress={authenticate}>
          <Text style={styles.buttonText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', padding: 24 },
  lockIcon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 32, textAlign: 'center' },
  button: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonText: { fontSize: 16, fontWeight: '500', color: '#374151' },
});
