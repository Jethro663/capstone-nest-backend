import { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '@/api/services/auth';
import { toAppError } from '@/api/http';
import type { AuthStackParamList } from '@/navigation/types';
import { AppButton, HeroCard, InlineNotice, Screen, TextField } from '@/shared/components/ui';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetActivationPassword'>;

export function SetActivationPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await authApi.setActivationPassword({
        email: email.trim(),
        newPassword,
      });
      setSuccess('Password set. Log in with your student account to continue.');
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
        eyebrow="Secure Account"
        title="Finish Activation"
        subtitle="Your email is verified. Set a personal password or return to login to use your temporary password."
      />

      <View className="mt-6 rounded-[28px] bg-white p-5 shadow-soft">
        <Text className="text-2xl font-black text-slate-950">Activation Password</Text>
        {!!error && <View className="mt-4"><InlineNotice tone="danger" text={error} /></View>}
        {!!success && <View className="mt-4"><InlineNotice tone="success" text={success} /></View>}

        <View className="mt-5 gap-4">
          <TextField label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" />
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
            placeholder="Repeat your password"
            secureTextEntry
          />
        </View>

        <View className="mt-6 gap-3">
          <AppButton title="Set Password" onPress={handleSetPassword} loading={loading} />
          <AppButton title="Use Temporary Password Instead" variant="secondary" onPress={() => navigation.replace('Login')} />
        </View>
      </View>
    </Screen>
  );
}
