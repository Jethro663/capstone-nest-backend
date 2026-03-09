import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/providers/AuthProvider';
import { authApi } from '@/api/services/auth';
import { toAppError } from '@/api/http';
import type { AuthStackParamList } from '@/navigation/types';
import { AppButton, HeroCard, InlineNotice, Screen, TextField } from '@/shared/components/ui';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email.trim(), password);
    } catch (rawError) {
      const appError = toAppError(rawError);
      if (appError.message.toLowerCase().includes('not verified')) {
        try {
          await authApi.validateCredentials({ email: email.trim(), password });
          navigation.navigate('VerifyEmail', {
            email: email.trim(),
            flow: 'activation',
          });
          return;
        } catch {
          setError('Invalid email or password.');
          return;
        }
      }

      setError(appError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen className="bg-[#fffafb]" contentContainerClassName="flex-grow justify-center px-5 py-8">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <HeroCard
          eyebrow="Student Portal"
          title="Welcome Back"
          subtitle="Access your classes, announcements, lessons, and assessments with the same Nexora student experience now ported to mobile."
        />

        <View className="mt-6 rounded-[28px] bg-white p-5 shadow-soft">
          <Text className="text-2xl font-black text-slate-950">Sign in to Nexora</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            Student accounts are managed by the school. Use your existing student login.
          </Text>

          {!!error && <View className="mt-4"><InlineNotice tone="danger" text={error} /></View>}

          <View className="mt-5 gap-4">
            <TextField
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="student@lms.local"
              keyboardType="email-address"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />
          </View>

          <View className="mt-6 gap-3">
            <AppButton title="Sign In" onPress={handleLogin} loading={loading} />
            <AppButton
              title="Forgot Password"
              variant="secondary"
              onPress={() => navigation.navigate('ForgotPassword')}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
