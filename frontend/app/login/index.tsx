import { useAuthSession } from '@/providers/AuthProvider';
import { ReactNode, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function Login(): ReactNode {
  const { signIn, signUp } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (e: any) {
      setError(e.message ?? 'Authentication failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <Button title={isSignUp ? 'Sign Up' : 'Sign In'} onPress={handleSubmit} />

      <Text style={styles.toggle} onPress={() => { setError(''); setIsSignUp(!isSignUp); }}>
        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  error: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
  toggle: {
    marginTop: 16,
    color: '#007AFF',
  },
});
