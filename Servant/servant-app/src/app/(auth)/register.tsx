import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import { useSkills } from '@/hooks/useSkills';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { SkillSelect } from '@/components/ui/SkillSelect';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import type { LocationValue } from '@/lib/locationTypes';

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, '');
}

export default function RegisterScreen() {
  const { t } = useTranslation();
  const submitApplication = useAuthStore((s) => s.submitApplication);
  const {
    data: skills = [],
    isLoading: skillsLoading,
    isError: skillsError,
    refetch: refetchSkills,
  } = useSkills();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    skills: [] as string[],
    addressText: '',
    city: '',
  });
  const [homeLocation, setHomeLocation] = useState<LocationValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const validate = (): string | null => {
    const name = form.name.trim();
    if (name.length < 2) return t('validation.nameMin');
    const email = form.email.trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) return t('validation.emailInvalid');
    const phone = digitsOnly(form.phone);
    if (phone.length < 10) return t('auth.mobileInvalid');
    if (skillsLoading) return t('auth.skillsLoading');
    if (form.skills.length === 0) return t('auth.skillRequired');
    const address = homeLocation?.address?.trim() || form.addressText.trim();
    if (address.length < 5) return t('auth.addressRequired');
    if (skillsError || skills.length === 0) return t('auth.skillsUnavailable');
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      Alert.alert(t('auth.registrationFailed'), err);
      return;
    }

    const address = homeLocation?.address?.trim() || form.addressText.trim();
    const phone = digitsOnly(form.phone);

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      await submitApplication({
        name: form.name.trim(),
        email,
        phone,
        skills: form.skills,
        address,
        city: homeLocation?.city || form.city.trim() || undefined,
        latitude: homeLocation?.latitude,
        longitude: homeLocation?.longitude,
      });
      setSubmittedEmail(email);
      setSubmitted(true);
    } catch (e: unknown) {
      Alert.alert(t('auth.registrationFailed'), getApiErrorMessage(e, 'auth.tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name' as const, label: t('auth.fullName') },
    { key: 'email' as const, label: t('auth.email') },
    { key: 'phone' as const, label: t('auth.mobile'), keyboard: 'phone-pad' as const },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <LanguageSelector compact showTitle />
        <Text style={styles.logo}>{t('auth.servantJoinTitle')}</Text>
        <Text style={styles.sub}>{t('auth.servantJoinSubtitle')}</Text>

        {submitted ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>{t('auth.registrationSuccess')}</Text>
            <Text style={styles.successBody}>{t('auth.registrationAgentContact')}</Text>
            {submittedEmail ? (
              <Text style={styles.successEmail}>
                {t('auth.registrationEmailNote', { email: submittedEmail })}
              </Text>
            ) : null}
            <Link href="/(auth)/login" asChild>
              <Text style={styles.link}>{t('auth.goToSignIn')}</Text>
            </Link>
          </View>
        ) : (
          <View>
            {fields.map((f) => (
              <GhostInput
                key={f.key}
                label={f.label}
                {...('keyboard' in f ? { keyboardType: f.keyboard } : {})}
                autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                value={form[f.key]}
                onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
              />
            ))}

            <SkillSelect
              label={t('auth.skills')}
              placeholder={t('auth.selectSkills')}
              skills={skills}
              loading={skillsLoading}
              value={form.skills}
              onChange={(skillsSelected) => setForm((prev) => ({ ...prev, skills: skillsSelected }))}
            />
            {skillsError && !skillsLoading ? (
              <Pressable onPress={() => refetchSkills()}>
                <Text style={styles.skillsError}>
                  {t('auth.skillsUnavailable')} {t('auth.tapToRetry')}
                </Text>
              </Pressable>
            ) : null}

            <LocationPicker
              label={t('auth.address')}
              placeholder={t('auth.searchPlaceholder')}
              value={homeLocation}
              onChange={(location) => {
                setHomeLocation(location);
                setForm((prev) => ({
                  ...prev,
                  addressText: location.address,
                  city: location.city || prev.city,
                }));
              }}
            />

            <GhostInput
              label={t('auth.addressManual')}
              placeholder={t('auth.addressManualPlaceholder')}
              value={form.addressText}
              onChangeText={(v) => setForm((prev) => ({ ...prev, addressText: v }))}
              multiline
              style={styles.addressInput}
            />

            {!homeLocation ? (
              <GhostInput
                label={t('auth.cityIfNoLocation')}
                value={form.city}
                onChangeText={(v) => setForm((prev) => ({ ...prev, city: v }))}
              />
            ) : null}

            <GradientButton title={t('auth.register')} onPress={submit} loading={loading} />

            <Link href="/(auth)/login" asChild>
              <Text style={styles.link}>{t('auth.alreadyHaveAccount')}</Text>
            </Link>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 56, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: '700', color: Stitch.colors.primary },
  sub: { color: Stitch.colors.onSurfaceVariant, marginTop: 8, marginBottom: 24 },
  addressInput: { minHeight: 88, textAlignVertical: 'top' },
  skillsError: {
    fontSize: 13,
    color: Stitch.colors.error,
    marginTop: -8,
    marginBottom: Stitch.spacing.gutter,
    textAlign: 'center',
  },
  successCard: {
    backgroundColor: Stitch.colors.primaryFixed,
    borderRadius: Stitch.radius.xl,
    padding: Stitch.spacing.padding,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  successIcon: { fontSize: 40, color: Stitch.colors.primary, fontWeight: '700' },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Stitch.colors.primary,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 15,
    color: Stitch.colors.onBackground,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  successEmail: {
    fontSize: 13,
    color: Stitch.colors.secondary,
    textAlign: 'center',
  },
  link: {
    textAlign: 'center',
    color: Stitch.colors.secondary,
    marginTop: 20,
    fontSize: 15,
    fontWeight: '600',
  },
});
