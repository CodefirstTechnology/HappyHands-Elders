import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Stitch, StatusColors } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { translateVerification } from '@/lib/i18n';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { formatCurrency } from '@/lib/i18n/format';
import { formatSkillLabel } from '@/lib/skills';

type Zone = { id: number; name: string; city?: string | null };
type Skill = { skillName: string };

type CaregiverProfile = {
  ageRangesServed?: string[];
  maxChildren?: number | null;
  emergencyResponseCertified?: boolean;
  dementiaCareCertified?: boolean;
  fallCareCertified?: boolean;
  eldercareNote?: string | null;
  verificationStatus: string;
  bio?: string | null;
  rating?: number;
  totalRatings?: number;
  hourlyRate?: number | null;
  monthlyRate?: number | null;
  experience?: number | null;
  zones?: Zone[];
  skills?: Skill[];
  user?: { name: string; email: string; phone?: string | null };
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout, refreshUser } = useAuthStore();
  const qc = useQueryClient();
  const [savingCerts, setSavingCerts] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshUser();
      void qc.invalidateQueries({ queryKey: ['caregiver-profile'] });
    }, [qc, refreshUser]),
  );

  const { data: profile } = useQuery({
    queryKey: ['caregiver-profile'],
    queryFn: async () => {
      const res = await api.get('/caregivers/me');
      return res.data.data.caregiver as CaregiverProfile;
    },
  });

  const updateCert = async (
    field: 'emergencyResponseCertified' | 'dementiaCareCertified' | 'fallCareCertified',
    value: boolean,
  ) => {
    setSavingCerts(true);
    try {
      await api.patch('/caregivers/me', { [field]: value });
      await qc.invalidateQueries({ queryKey: ['caregiver-profile'] });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(t('errors.generic'), err.response?.data?.message || t('errors.couldNotSave'));
    } finally {
      setSavingCerts(false);
    }
  };

  const zones: Zone[] = profile?.zones || [];
  const skills = profile?.skills || [];
  const verification = profile?.verificationStatus || user?.caregiver?.verificationStatus || 'PENDING';
  const verifyStyle = StatusColors[verification] || StatusColors.PENDING;
  const displayName = profile?.user?.name || user?.name || t('verification.verifiedHelper');
  const email = profile?.user?.email || user?.email;
  const phone = profile?.user?.phone;
  const initial = displayName.trim()[0]?.toUpperCase() || '?';

  const signOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.screenTitle}>{t('profile.title')}</Text>

      <LinearGradient
        colors={[Stitch.colors.primary, Stitch.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          {verification === 'VERIFIED' ? (
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={16} color="#1D9BF0" />
            </View>
          ) : null}
        </View>

        <Text style={styles.heroName} numberOfLines={2}>
          {displayName}
        </Text>
        <Text style={styles.heroBrand}>{t('common.appNamePro')}</Text>

        {verification === 'VERIFIED' ? (
          <VerifiedBadge size="md" />
        ) : (
          <View style={[styles.verifyPill, { backgroundColor: verifyStyle.bg }]}>
            <Text style={[styles.verifyText, { color: verifyStyle.text }]}>
              {translateVerification(verification)}
            </Text>
          </View>
        )}

        {email ? (
          <View style={styles.metaRow}>
            <MaterialIcons name="mail-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.metaText} numberOfLines={1}>
              {email}
            </Text>
          </View>
        ) : null}
        {phone ? (
          <View style={styles.metaRow}>
            <MaterialIcons name="phone" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.metaText}>{phone}</Text>
          </View>
        ) : null}
      </LinearGradient>

      {(profile?.rating != null ||
        profile?.hourlyRate != null ||
        profile?.experience != null) && (
        <GlassCard style={styles.statsCard}>
          <View style={styles.statsRow}>
            {profile?.rating != null ? (
              <View style={styles.stat}>
                <MaterialIcons name="star" size={20} color={Stitch.colors.secondary} />
                <Text style={styles.statValue}>{profile.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>{t('servantProfile.rating')}</Text>
              </View>
            ) : null}
            {profile?.hourlyRate != null ? (
              <View style={styles.stat}>
                <MaterialIcons name="schedule" size={20} color={Stitch.colors.secondary} />
                <Text style={styles.statValue}>
                  {t('common.rupee')}
                  {formatCurrency(profile.hourlyRate)}
                </Text>
                <Text style={styles.statLabel}>{t('servantProfile.perHour')}</Text>
              </View>
            ) : null}
            {profile?.experience != null ? (
              <View style={styles.stat}>
                <MaterialIcons name="work-outline" size={20} color={Stitch.colors.secondary} />
                <Text style={styles.statValue}>{profile.experience}y</Text>
                <Text style={styles.statLabel}>{t('servantProfile.experience')}</Text>
              </View>
            ) : null}
          </View>
        </GlassCard>
      )}

      {skills.length > 0 ? (
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIcon}>
              <MaterialIcons name="handyman" size={20} color={Stitch.colors.secondary} />
            </View>
            <Text style={styles.sectionTitle}>{t('servantProfile.yourSkills')}</Text>
          </View>
          <View style={styles.skillChips}>
            {skills.map((s) => (
              <View key={s.skillName} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{formatSkillLabel(s.skillName, [])}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      ) : null}

      {profile?.bio ? (
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIcon}>
              <MaterialIcons name="info-outline" size={20} color={Stitch.colors.secondary} />
            </View>
            <Text style={styles.sectionTitle}>{t('caregiverProfile.aboutYou')}</Text>
          </View>
          <Text style={styles.bio}>{profile.bio}</Text>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="elderly" size={20} color={Stitch.colors.secondary} />
          </View>
          <Text style={styles.sectionTitle}>{t('caregiverProfile.eldercareDetails')}</Text>
        </View>
        {profile?.ageRangesServed?.length ? (
          <Text style={styles.bio}>
            {t('caregiverProfile.ageRanges')}: {profile.ageRangesServed.join(', ')}
          </Text>
        ) : null}
        {profile?.maxChildren != null ? (
          <Text style={styles.bio}>{t('caregiverProfile.maxElders')}: {profile.maxChildren}</Text>
        ) : null}
        <View style={styles.certToggleRow}>
          <Text style={styles.certLabel}>{t('caregiverProfile.emergencyResponseCert')}</Text>
          <Switch
            value={!!profile?.emergencyResponseCertified}
            onValueChange={(v) => void updateCert('emergencyResponseCertified', v)}
            disabled={savingCerts}
          />
        </View>
        <View style={styles.certToggleRow}>
          <Text style={styles.certLabel}>{t('caregiverProfile.dementiaCareCert')}</Text>
          <Switch
            value={!!profile?.dementiaCareCertified}
            onValueChange={(v) => void updateCert('dementiaCareCertified', v)}
            disabled={savingCerts}
          />
        </View>
        <View style={styles.certToggleRow}>
          <Text style={styles.certLabel}>{t('caregiverProfile.fallCareCert')}</Text>
          <Switch
            value={!!profile?.fallCareCertified}
            onValueChange={(v) => void updateCert('fallCareCertified', v)}
            disabled={savingCerts}
          />
        </View>
        {profile?.eldercareNote ? (
          <Text style={[styles.bio, { marginTop: 8 }]}>{profile.eldercareNote}</Text>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.languageCard}>
        <LanguageSelector showTitle />
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="map" size={20} color={Stitch.colors.secondary} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>{t('zones.title')}</Text>
            <Text style={styles.sectionSub}>{t('servantProfile.serviceZonesSub')}</Text>
          </View>
        </View>

        {zones.length === 0 ? (
          <Text style={styles.zoneEmpty}>{t('zones.emptyAgent')}</Text>
        ) : (
          <View style={styles.zoneChips}>
            {zones.map((z) => (
              <View key={z.id} style={styles.zoneChip}>
                <MaterialIcons name="place" size={14} color={Stitch.colors.primary} />
                <Text style={styles.zoneChipText}>
                  {z.name}
                  {z.city ? ` · ${z.city}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {zones.length > 0 ? (
          <TouchableOpacity
            style={styles.zoneBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(main)/zones')}
          >
            <MaterialIcons name="map" size={22} color={Stitch.colors.primary} />
            <View style={styles.zoneBtnTextWrap}>
              <Text style={styles.zoneBtnTitle}>{t('zones.view')}</Text>
              <Text style={styles.zoneBtnSub}>{t('zones.viewSub')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={Stitch.colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : null}
      </GlassCard>

      <GradientButton title={t('auth.signOut')} variant="outline" onPress={signOut} style={styles.signOutBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { paddingHorizontal: Stitch.spacing.padding, paddingTop: 52, paddingBottom: 48 },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginBottom: 16,
  },
  hero: {
    borderRadius: Stitch.radius.xl,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Stitch.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Stitch.colors.primary },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1D9BF0',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  heroBrand: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  verifyPill: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Stitch.radius.pill,
  },
  verifyText: { fontSize: 12, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    maxWidth: '100%',
    paddingHorizontal: 8,
  },
  metaText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, flexShrink: 1 },
  languageCard: { marginBottom: 12 },
  statsCard: { marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 4, flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700', color: Stitch.colors.primary },
  statLabel: { fontSize: 11, color: Stitch.colors.onSurfaceVariant, fontWeight: '600' },
  sectionCard: { marginBottom: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadText: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Stitch.colors.onBackground },
  sectionSub: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginTop: 3, lineHeight: 16 },
  skillChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    backgroundColor: Stitch.colors.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Stitch.radius.pill,
  },
  skillChipText: { fontSize: 13, fontWeight: '600', color: Stitch.colors.primary },
  bio: { fontSize: 14, lineHeight: 22, color: Stitch.colors.onSurfaceVariant },
  certToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Stitch.colors.outlineVariant,
  },
  certLabel: { fontSize: 14, fontWeight: '600', color: Stitch.colors.onBackground, flex: 1 },
  zoneEmpty: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, lineHeight: 20, marginBottom: 4 },
  zoneChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Stitch.colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Stitch.radius.pill,
  },
  zoneChipText: { fontSize: 13, fontWeight: '600', color: Stitch.colors.primary },
  zoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Stitch.colors.outlineVariant,
    gap: 12,
  },
  zoneBtnTextWrap: { flex: 1 },
  zoneBtnTitle: { fontSize: 15, fontWeight: '700', color: Stitch.colors.onBackground },
  zoneBtnSub: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginTop: 2 },
  signOutBtn: { marginTop: 8 },
});
