import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || 'Something went wrong';
      const isConfigError =
        message.includes('API key') ||
        message.includes('URL') ||
        message.includes('Supabase') ||
        message.includes('supabase');

      return (
        <View style={styles.container}>
          <Text style={styles.title}>
            {isConfigError ? 'Configuration Error' : 'Something went wrong'}
          </Text>
          <Text style={styles.message}>
            {isConfigError
              ? 'Unable to connect to the database. Please check that the app is configured with valid Supabase credentials.'
              : message}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 32,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#dc2626' },
  message: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
