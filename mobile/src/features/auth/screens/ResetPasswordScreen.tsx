import { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '@/api/services/auth';
import { toAppError } from '@/api/http';
import type { AuthStackParamList } from '@/navigation/types';
import { AppButton, HeroCard, InlineNotice, Screen, TextField } from '@/shared/components/ui';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [code, setCode] = useState(route.params?.code ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleReset = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await authApi.resetPassword({
        email: email.trim(),
        code: code.trim(),
        password: newPassword,
        confirmPassword,
      });
      setSuccess('Password reset successful. Please log in with your new password.');
      navigation.replace('Login');
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen className="bg-[#fffafb]">
      <HeroCard
        eyebrow="Reset Password"
        title="Set a New Password"
        subtitle="Enter the code from your email and choose a strong replacement password."
      />

      <View className="mt-6 rounded-[28px] bg-white p-5 shadow-soft">
        <Text className="text-2xl font-black text-slate-950">Choose New Password</Text>
        {!!error && <View className="mt-4"><InlineNotice tone="danger" text={error} /></View>}
        {!!success && <View className="mt-4"><InlineNotice tone="success" text={success} /></View>}

        <View className="mt-5 gap-4">
          <TextField label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <TextField label="Reset Code" value={code} onChangeText={setCode} placeholder="Enter your reset code" />
          <TextField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Create a strong password"
            secureTextEntry
          />
          <TextField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat your new password"
            secureTextEntry
          />
        </View>

        <View className="mt-6 gap-3">
          <AppButton title="Reset Password" onPress={handleReset} loading={loading} />
          <AppButton title="Back to Login" variant="ghost" onPress={() => navigation.replace('Login')} />
        </View>
      </View>
    </Screen>
  );
}
