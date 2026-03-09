import { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '@/api/services/auth';
import { toAppError } from '@/api/http';
import type { AuthStackParamList } from '@/navigation/types';
import { AppButton, HeroCard, InlineNotice, Screen, TextField } from '@/shared/components/ui';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSend = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await authApi.forgotPassword(email.trim());
      setSuccess('If the account exists, a reset code has been sent.');
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen className="bg-[#fffafb]">
      <HeroCard
        eyebrow="Password Reset"
        title="Recover Access"
        subtitle="Request a password reset code and continue with the secure student recovery flow."
      />

      <View className="mt-6 rounded-[28px] bg-white p-5 shadow-soft">
        <Text className="text-2xl font-black text-slate-950">Reset Password</Text>
        <Text className="mt-2 text-sm text-slate-500">
          Enter your Nexora student email and we'll send a reset code.
        </Text>
        {!!error && <View className="mt-4"><InlineNotice tone="danger" text={error} /></View>}
        {!!success && <View className="mt-4"><InlineNotice tone="success" text={success} /></View>}

        <View className="mt-5 gap-4">
          <TextField
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="student@lms.local"
            keyboardType="email-address"
          />
        </View>

        <View className="mt-6 gap-3">
          <AppButton title="Send Reset Code" onPress={handleSend} loading={loading} />
          <AppButton title="Back to Login" variant="ghost" onPress={() => navigation.replace('Login')} />
        </View>
      </View>
    </Screen>
  );
}
