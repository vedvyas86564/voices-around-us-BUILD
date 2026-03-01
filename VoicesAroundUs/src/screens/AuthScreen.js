import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { colors, fonts } from '../theme';
import { useAuth } from '../hooks/useAuth';

export default function AuthScreen({ navigation }) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    if (!email || !password) { setError('Enter email and password'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err.message);
  }

  async function handleSignUp() {
    if (!email || !password) { setError('Enter email and password'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await signUp(email, password);
    setLoading(false);
    if (err) setError(err.message);
    else Alert.alert('Account Created', 'Check your email to confirm your account.');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🗺</Text>
        <Text style={styles.appName}>Voices Around Us</Text>
        <Text style={styles.tagline}>
          Share the stories{'\n'}that live in your spaces.
        </Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="UCLA email address"
          placeholderTextColor="#C4BAB0"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#C4BAB0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.cta, loading && styles.ctaDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.divider}>— or —</Text>

        <TouchableOpacity
          style={styles.ctaSecondary}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaSecondaryText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('MainTabs')}
          style={styles.anonBtn}
        >
          <Text style={styles.anonText}>Continue without account →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 52,
    marginBottom: 16,
  },
  appName: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 44,
    lineHeight: 21,
    fontFamily: fonts.sans,
  },
  errorBox: {
    backgroundColor: '#FEF0EE',
    borderWidth: 1,
    borderColor: '#F5C6C0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    width: '100%',
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    fontFamily: fonts.sans,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.sandDark,
    borderRadius: 14,
    padding: 14,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 12,
  },
  cta: {
    width: '100%',
    backgroundColor: colors.amber,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 8,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  divider: {
    fontSize: 12,
    color: colors.muted,
    marginVertical: 4,
    fontFamily: fonts.sans,
  },
  ctaSecondary: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.amber,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaSecondaryText: {
    color: colors.amber,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  anonBtn: {
    marginTop: 4,
  },
  anonText: {
    fontSize: 13,
    color: colors.muted,
    textDecorationLine: 'underline',
    fontFamily: fonts.sans,
  },
});
