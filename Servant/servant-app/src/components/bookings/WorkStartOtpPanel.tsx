import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import api from '@/lib/api';

type Props = {
  bookingId: number;
  expiresAt?: string | null;
  onVerified: () => void;
  onResend: () => void;
};

export function WorkStartOtpPanel({ bookingId, expiresAt, onVerified, onResend }: Props) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const submit = async () => {
    if (!/^\d{4}$/.test(otp)) {
      Alert.alert(t('workOtp.invalidTitle'), t('workOtp.invalidBody'));
      return;
    }
    setLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/verify-work-otp`, { otp });
      setOtp('');
      onVerified();
      Alert.alert(t('workOtp.successTitle'), t('workOtp.successBody'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(t('workOtp.failedTitle'), err.response?.data?.message || t('auth.tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await api.post(`/bookings/${bookingId}/resend-work-otp`);
      onResend();
      Alert.alert(t('workOtp.resentTitle'), t('workOtp.resentBody'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(t('workOtp.failedTitle'), err.response?.data?.message || t('auth.tryAgain'));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('workOtp.title')}</Text>
      <Text style={styles.sub}>{t('workOtp.sub')}</Text>
      {expiresAt ? (
        <Text style={styles.expires}>{t('workOtp.expiresHint')}</Text>
      ) : null}
      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        placeholder={t('workOtp.placeholder')}
        placeholderTextColor={Stitch.colors.onSurfaceVariant}
      />
      <GradientButton title={t('workOtp.verifyStart')} onPress={submit} loading={loading} />
      <TouchableOpacity style={styles.resend} onPress={resend} disabled={resending}>
        <Text style={styles.resendText}>
          {resending ? t('workOtp.resending') : t('workOtp.resend')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Stitch.colors.primaryFixed,
  },
  title: { fontSize: 15, fontWeight: '700', color: Stitch.colors.primary },
  sub: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 6, lineHeight: 18 },
  expires: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  input: {
    marginTop: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    color: Stitch.colors.primary,
  },
  resend: { marginTop: 10, alignItems: 'center' },
  resendText: { color: Stitch.colors.primary, fontWeight: '600', fontSize: 13 },
});
