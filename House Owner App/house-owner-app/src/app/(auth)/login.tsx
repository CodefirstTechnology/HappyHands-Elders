import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

export default function LoginScreen() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('validation.emailInvalid')),
        password: z.string().min(1, t('validation.passwordRequired')),
      }),
    [t],
  );

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      router.replace('/(main)/home');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(t('auth.loginFailed'), err.response?.data?.message || t('auth.tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LanguageSelector compact showTitle />
        <Text style={styles.logo}>{t('common.appName')}</Text>
        <Text style={styles.subtitle}>{t('auth.trustedSubtitle')}</Text>
        <Text style={styles.trust}>{t('auth.trustLine')}</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <GhostInput
              label={t('auth.email')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <GhostInput
              label={t('auth.password')}
              secureTextEntry
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <GradientButton title={t('auth.signIn')} onPress={handleSubmit(onSubmit)} loading={loading} />

        <Link href="/(auth)/register" asChild>
          <Text style={styles.link}>{t('auth.newAccount')}</Text>
        </Link>

        <Text style={styles.safe}>{t('auth.safeData')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.surfaceHighest },
  blob1: {
    position: 'absolute',
    top: -80,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(125, 68, 164, 0.08)',
  },
  blob2: {
    position: 'absolute',
    bottom: 40,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(21, 21, 125, 0.06)',
  },
  scroll: {
    flexGrow: 1,
    padding: Stitch.spacing.padding,
    paddingTop: 72,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  logo: {
    ...Stitch.typography.headline,
    fontSize: 32,
    color: Stitch.colors.primary,
    marginBottom: 8,
  },
  subtitle: { ...Stitch.typography.body, color: Stitch.colors.onSurfaceVariant, marginBottom: 8 },
  trust: {
    ...Stitch.typography.caption,
    color: Stitch.colors.secondary,
    marginBottom: 28,
    lineHeight: 18,
  },
  link: {
    color: Stitch.colors.primary,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
    fontSize: 15,
  },
  safe: {
    ...Stitch.typography.caption,
    color: Stitch.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 32,
    opacity: 0.8,
  },
});
