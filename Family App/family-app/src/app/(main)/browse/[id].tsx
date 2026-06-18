import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { localizedSkillLabel } from '@/lib/skills';
import { formatCurrency } from '@/lib/i18n/format';
import { useSkills } from '@/hooks/useSkills';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useAuthStore } from '@/store/authStore';

export default function ServantDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: skills = [] } = useSkills();
  const { location: liveLocation } = useLiveLocation();

  const searchLocation = useMemo(() => {
    if (liveLocation?.latitude != null && liveLocation?.longitude != null) {
      return liveLocation;
    }
    const ho = user?.parent;
    if (ho?.latitude != null && ho?.longitude != null) {
      return { latitude: ho.latitude, longitude: ho.longitude };
    }
    return null;
  }, [liveLocation, user?.parent]);

  const { data: servant, isLoading, error } = useQuery({
    queryKey: ['caregiver', id, searchLocation?.latitude, searchLocation?.longitude],
    enabled: !!id,
    queryFn: async () => {
      const params: Record<string, number> = {};
      if (searchLocation) {
        params.latitude = searchLocation.latitude;
        params.longitude = searchLocation.longitude;
      }
      const res = await api.get(`/caregivers/${id}`, { params });
      return res.data.data.caregiver;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('browse.loadingProfile')}</Text>
      </View>
    );
  }

  if (error || !servant) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('browse.helperNotInArea')}</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.backLink}>← {t('browse.backToBrowse')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <MaterialIcons name="arrow-back" size={28} color={Stitch.colors.primary} />
      </Pressable>
      <GlassCard>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{servant.user.name[0]}</Text>
        </View>
        <Text style={styles.name}>{servant.user.name}</Text>
        <View style={styles.verified}>
          <MaterialIcons name="verified" size={16} color={Stitch.colors.success} />
          <Text style={styles.verifiedText}>{t('browse.agentVerified')}</Text>
        </View>
        <Text style={styles.skills}>
          {servant.skills
            ?.map((s: { skillName: string }) => localizedSkillLabel(s.skillName, skills))
            .join(' · ')}
        </Text>
        <Text style={styles.rate}>
          ★ {servant.rating?.toFixed(1) || '0.0'} · {Stitch.copy.rupee}
          {servant.hourlyRate ? formatCurrency(servant.hourlyRate) : '—'}
          {t('browse.perHr')} · {Stitch.copy.rupee}
          {servant.monthlyRate ? formatCurrency(servant.monthlyRate) : '—'}
          {t('browse.perMo')}
        </Text>
        {servant.bio ? <Text style={styles.bio}>{servant.bio}</Text> : null}
        {servant.zones?.length > 0 ? (
          <View style={styles.zonesBlock}>
            <Text style={styles.zonesTitle}>{t('browse.serviceZones')}</Text>
            <View style={styles.zoneChips}>
              {servant.zones.map((z: { id: number; name: string; city?: string }) => (
                <View key={z.id} style={styles.zoneChip}>
                  <MaterialIcons name="place" size={14} color={Stitch.colors.secondary} />
                  <Text style={styles.zoneChipText}>
                    {z.name}
                    {z.city ? ` · ${z.city}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </GlassCard>
      <GradientButton
        title={t('browse.bookHelper')}
        onPress={() =>
          router.push({
            pathname: '/(main)/bookings/new',
            params: { caregiverId: String(servant.id) },
          })
        }
        style={{ marginTop: 20 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 52, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Stitch.colors.onSurfaceVariant },
  backLink: { color: Stitch.colors.primary, fontWeight: '600' },
  back: { marginBottom: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Stitch.colors.primary },
  name: { fontSize: 24, fontWeight: '700' },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  verifiedText: { color: Stitch.colors.success, fontWeight: '600' },
  skills: { marginTop: 8, color: Stitch.colors.onSurfaceVariant },
  rate: { marginTop: 8, fontWeight: '600', color: Stitch.colors.secondary },
  bio: { marginTop: 12, lineHeight: 22, color: Stitch.colors.onBackground },
  zonesBlock: { marginTop: 16 },
  zonesTitle: { fontSize: 14, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  zoneChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Stitch.colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Stitch.radius.pill,
  },
  zoneChipText: { fontSize: 12, fontWeight: '600', color: Stitch.colors.primary },
});
