import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import type { LocationValue } from '@/lib/locationTypes';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: '',
  });
  const [homeLocation, setHomeLocation] = useState<LocationValue | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (form.password !== form.confirmPassword) {
      Alert.alert(t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        city: homeLocation?.city || form.city,
        address: homeLocation?.address,
        latitude: homeLocation?.latitude,
        longitude: homeLocation?.longitude,
      });
      router.replace('/(main)/home');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(t('auth.registrationFailed'), err.response?.data?.message || t('auth.tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name' as const, label: t('auth.fullName'), secure: false },
    { key: 'email' as const, label: t('auth.email'), secure: false },
    { key: 'phone' as const, label: t('auth.phone'), secure: false, keyboard: 'phone-pad' as const },
    { key: 'password' as const, label: t('auth.password'), secure: true },
    { key: 'confirmPassword' as const, label: t('auth.confirmPassword'), secure: true },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <LanguageSelector compact showTitle />
      <Text style={styles.logo}>{t('auth.joinTitle')}</Text>
      <Text style={styles.sub}>{t('auth.joinSubtitle')}</Text>
      {fields.map((f) => (
        <GhostInput
          key={f.key}
          label={f.label}
          secureTextEntry={f.secure}
          {...('keyboard' in f ? { keyboardType: f.keyboard } : {})}
          autoCapitalize={f.key === 'email' ? 'none' : 'words'}
          value={form[f.key]}
          onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
        />
      ))}

      <LocationPicker
        label={t('auth.homeLocationOptional')}
        placeholder={t('auth.searchPlaceholder')}
        value={homeLocation}
        onChange={(location) => {
          setHomeLocation(location);
          if (location.city) {
            setForm((prev) => ({ ...prev, city: location.city || prev.city }));
          }
        }}
      />

      {!homeLocation ? (
        <GhostInput
          label={t('auth.cityIfNoLocation')}
          value={form.city}
          onChangeText={(v) => setForm((prev) => ({ ...prev, city: v }))}
        />
      ) : null}

      <GradientButton title={t('auth.createAccount')} onPress={submit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: '700', color: Stitch.colors.primary },
  sub: { color: Stitch.colors.onSurfaceVariant, marginBottom: 24, marginTop: 8 },
});
