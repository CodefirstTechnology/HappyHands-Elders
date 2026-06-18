import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { getLoginErrorMessage } from '@/lib/getLoginErrorMessage';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

export default function LoginScreen() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(main)/home');
    } catch (e: unknown) {
      Alert.alert(t('auth.loginFailed'), getLoginErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <LanguageSelector compact showTitle />
        <Text style={styles.badge}>{t('common.appNamePro')}</Text>
        <Text style={styles.logo}>{t('auth.welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('auth.servantLoginSubtitle')}</Text>

        <GhostInput
          label={t('auth.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <GhostInput
          label={t('auth.password')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <GradientButton title={t('auth.signIn')} onPress={submit} loading={loading} />

        <Link href="/(auth)/register" asChild>
          <Text style={styles.link}>{t('auth.servantNewAccount')}</Text>
        </Link>
        <Text style={styles.trust}>{t('auth.safeData')}</Text>
        {__DEV__ ? (
          <Text style={styles.apiHint} selectable>
            API: {getApiBaseUrl()}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.surfaceHighest },
  blob1: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(125, 68, 164, 0.1)',
  },
  blob2: {
    position: 'absolute',
    bottom: 80,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(21, 21, 125, 0.06)',
  },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 72 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Stitch.colors.primaryFixed,
    color: Stitch.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  logo: { fontSize: 32, fontWeight: '700', color: Stitch.colors.primary },
  subtitle: {
    fontSize: 16,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 24,
  },
  link: {
    textAlign: 'center',
    color: Stitch.colors.secondary,
    marginTop: 20,
    fontSize: 15,
    fontWeight: '600',
  },
  trust: {
    textAlign: 'center',
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 24,
    fontSize: 12,
    opacity: 0.75,
  },
  apiHint: {
    marginTop: 16,
    fontSize: 11,
    color: Stitch.colors.secondary,
    textAlign: 'center',
  },
});
