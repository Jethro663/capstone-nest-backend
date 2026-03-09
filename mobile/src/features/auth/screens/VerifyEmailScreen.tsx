import { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '@/api/services/auth';
import { toAppError } from '@/api/http';
import type { AuthStackParamList } from '@/navigation/types';
import { AppButton, HeroCard, InlineNotice, Screen, TextField } from '@/shared/components/ui';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

export function VerifyEmailScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await authApi.verifyEmail({ email: email.trim(), code: code.trim() });
      setSuccess('Email verified successfully.');
      if (route.params?.flow === 'activation') {
        navigation.replace('SetActivationPassword', { email: email.trim() });
      } else {
        navigation.replace('Login');
      }
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      setError('');
      await authApi.resendOtp(email.trim());
      setSuccess('A new verification code has been sent to your email.');
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen className="bg-[#fffafb]">
      <HeroCard
        eyebrow="Email Verification"
        title="Confirm Your Account"
        subtitle="Use the OTP from your inbox to activate your student account or complete email verification."
      />

      <View className="mt-6 rounded-[28px] bg-white p-5 shadow-soft">
        <Text className="text-2xl font-black text-slate-950">Verification Code</Text>
        <Text className="mt-2 text-sm text-slate-500">
          Enter the 6-character code sent to {email || 'your email'}.
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
          <TextField
            label="Verification Code"
            value={code}
            onChangeText={setCode}
            placeholder="000000"
          />
        </View>

        <View className="mt-6 gap-3">
          <AppButton title="Verify Email" onPress={handleVerify} loading={loading} />
          <AppButton title="Resend Code" variant="secondary" onPress={handleResend} loading={resending} />
          <AppButton title="Back to Login" variant="ghost" onPress={() => navigation.replace('Login')} />
        </View>
      </View>
    </Screen>
  );
}
