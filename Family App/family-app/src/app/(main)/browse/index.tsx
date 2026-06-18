import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { useSkills } from '@/hooks/useSkills';
import { localizedSkillLabel } from '@/lib/skills';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useAuthStore } from '@/store/authStore';
import type { LocationValue } from '@/lib/locationTypes';
import { ELDER_AGE_RANGES } from '@/constants/elderCare';

export default function BrowseScreen() {
  const { t } = useTranslation();
  const { skill: skillParam } = useLocalSearchParams<{ skill?: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: skills = [] } = useSkills();
  const { location: liveLocation, loading: locLoading, error: locError } = useLiveLocation();
  const [skill, setSkill] = useState('');
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [maxChildren, setMaxChildren] = useState('');
  const [emergencyResponseCert, setEmergencyResponseCert] = useState(false);
  const [dementiaCareCert, setDementiaCareCert] = useState(false);
  const [fallCareCert, setFallCareCert] = useState(false);
  const skillCodes = skills.map((s) => s.code);

  const searchLocation = useMemo<LocationValue | null>(() => {
    if (
      liveLocation?.latitude != null &&
      liveLocation?.longitude != null &&
      !Number.isNaN(liveLocation.latitude) &&
      !Number.isNaN(liveLocation.longitude)
    ) {
      return liveLocation;
    }
    const fc = user?.familyClient;
    if (
      fc?.latitude != null &&
      fc?.longitude != null &&
      !Number.isNaN(fc.latitude) &&
      !Number.isNaN(fc.longitude)
    ) {
      return {
        address: fc.address || fc.city || t('common.savedHome'),
        city: fc.city,
        latitude: fc.latitude,
        longitude: fc.longitude,
      };
    }
    return null;
  }, [liveLocation, user?.familyClient]);

  useEffect(() => {
    const raw = Array.isArray(skillParam) ? skillParam[0] : skillParam;
    const next = raw?.toUpperCase();
    if (next && skillCodes.includes(next)) {
      setSkill(next);
    }
  }, [skillParam, skillCodes.join(',')]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['caregivers', skill, city, zone, ageRange, maxChildren, emergencyResponseCert, dementiaCareCert, fallCareCert, searchLocation?.latitude, searchLocation?.longitude],
    enabled: !locLoading && !!searchLocation,
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = {
        skill: skill || undefined,
        city: city || undefined,
        zone: zone || undefined,
        ageRange: ageRange || undefined,
        maxChildren: maxChildren ? Number(maxChildren) : undefined,
        emergencyResponseCertified: emergencyResponseCert ? 'true' : undefined,
        dementiaCareCertified: dementiaCareCert ? 'true' : undefined,
        fallCareCertified: fallCareCert ? 'true' : undefined,
        latitude: searchLocation!.latitude,
        longitude: searchLocation!.longitude,
      } as Record<string, string | number | boolean>;
      const res = await api.get('/caregivers', { params });
      return res.data.data.caregivers;
    },
  });

  const nearbyCount = data?.length ?? 0;
  const skillLabel = skill ? localizedSkillLabel(skill, skills) : null;

  const broadcastMessage = (() => {
    if (!searchLocation) {
      return t('browse.enableLocationBroadcast');
    }
    if (nearbyCount > 0) {
      return t('browse.broadcastToArea', { count: nearbyCount });
    }
    if (skillLabel) {
      return t('browse.noSkillInArea', { skill: skillLabel });
    }
    return t('browse.noHelpersInArea');
  })();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Stitch.colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {skillLabel ? t('browse.skillHelpers', { skill: skillLabel }) : t('browse.findHelp')}
        </Text>
        <Text style={styles.sub}>
          {skillLabel
            ? nearbyCount > 0
              ? t('browse.skillNearYou', { count: nearbyCount, skill: skillLabel.toLowerCase() })
              : t('browse.noSkillNearby', { skill: skillLabel.toLowerCase() })
            : t('browse.helpersNearLive')}
        </Text>
        {skillLabel ? (
          <View style={styles.activeFilterRow}>
            <View style={styles.activeFilterPill}>
              <MaterialIcons name="category" size={14} color={Stitch.colors.secondary} />
              <Text style={styles.activeFilterText}>{skillLabel}</Text>
            </View>
            <TouchableOpacity onPress={() => setSkill('')} hitSlop={8}>
              <Text style={styles.clearFilter}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      {searchLocation ? (
        <TouchableOpacity
          style={styles.liveLoc}
          activeOpacity={0.85}
          onPress={() => router.push('/(main)/profile')}
        >
          <MaterialIcons name="my-location" size={18} color={Stitch.colors.secondary} />
          <Text style={styles.liveLocText} numberOfLines={2}>
            {searchLocation.address}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={Stitch.colors.onSurfaceVariant} />
        </TouchableOpacity>
      ) : locError || !locLoading ? (
        <TouchableOpacity
          style={styles.locErrorBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(main)/profile')}
        >
          <MaterialIcons name="location-off" size={18} color={Stitch.colors.error} />
          <Text style={styles.locError}>
            {locError || t('browse.tapSetHomeProfile')}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={Stitch.colors.error} />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={[styles.broadcastBtn, !searchLocation && styles.broadcastBtnDisabled]}
        disabled={!searchLocation}
        onPress={() =>
          router.push({
            pathname: '/(main)/bookings/request',
            params: skill ? { skill } : undefined,
          })
        }
      >
        <Text style={styles.broadcastTitle}>
          {skillLabel ? t('browse.requestSkillHelp', { skill: skillLabel }) : t('bookings.requestHelpArea')}
        </Text>
        <Text style={styles.broadcastSub}>{broadcastMessage}</Text>
        {skillLabel && searchLocation ? (
          <View style={styles.broadcastBadge}>
            <Text style={styles.broadcastBadgeText}>{skillLabel}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
      <View style={styles.searchWrap}>
        <MaterialIcons name="location-city" size={20} color={Stitch.colors.onSurfaceVariant} />
        <TextInput
          style={styles.search}
          placeholder={t('browse.cityPlaceholder')}
          placeholderTextColor={Stitch.colors.onSurfaceVariant + '99'}
          value={city}
          onChangeText={setCity}
        />
      </View>
      <View style={[styles.searchWrap, { marginTop: 0, marginBottom: 12 }]}>
        <MaterialIcons name="place" size={20} color={Stitch.colors.onSurfaceVariant} />
        <TextInput
          style={styles.search}
          placeholder={t('browse.zonePlaceholder')}
          placeholderTextColor={Stitch.colors.onSurfaceVariant + '99'}
          value={zone}
          onChangeText={setZone}
        />
      </View>
      <View style={styles.chipsSection}>
        <Text style={styles.chipsLabel}>{t('browse.ageRange')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
          {ELDER_AGE_RANGES.map(({ value, label }) => {
            const selected = ageRange === value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.chip, selected && styles.chipOn]}
                onPress={() => setAgeRange(ageRange === value ? '' : value)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.searchWrap}>
        <MaterialIcons name="elderly" size={20} color={Stitch.colors.onSurfaceVariant} />
        <TextInput
          style={styles.search}
          placeholder={t('browse.maxChildrenPlaceholder')}
          placeholderTextColor={Stitch.colors.onSurfaceVariant + '99'}
          value={maxChildren}
          onChangeText={setMaxChildren}
          keyboardType="number-pad"
        />
      </View>
      <View style={styles.certRow}>
        <TouchableOpacity
          style={[styles.certChip, emergencyResponseCert && styles.certChipOn]}
          onPress={() => setEmergencyResponseCert(!emergencyResponseCert)}
        >
          <Text style={[styles.certText, emergencyResponseCert && styles.certTextOn]}>
            {t('browse.emergencyResponseCertified')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.certChip, dementiaCareCert && styles.certChipOn]}
          onPress={() => setDementiaCareCert(!dementiaCareCert)}
        >
          <Text style={[styles.certText, dementiaCareCert && styles.certTextOn]}>
            {t('browse.dementiaCareCertified')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.certChip, fallCareCert && styles.certChipOn]}
          onPress={() => setFallCareCert(!fallCareCert)}
        >
          <Text style={[styles.certText, fallCareCert && styles.certTextOn]}>
            {t('browse.fallCareCertified')}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chipsSection}>
        <Text style={styles.chipsLabel}>{t('browse.category')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
        >
          {skills.map((s) => {
            const selected = skill === s.code;
            return (
              <TouchableOpacity
                key={s.code}
                style={[styles.chip, selected && styles.chipOn]}
                onPress={() => setSkill(skill === s.code ? '' : s.code)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextOn]}
                  numberOfLines={1}
                  {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                >
                  {localizedSkillLabel(s.code, skills)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <GlassCard style={styles.countCard}>
        <View style={styles.countRow}>
          <View style={styles.countIcon}>
            <MaterialIcons name="groups" size={32} color={Stitch.colors.secondary} />
          </View>
          <View style={styles.countBody}>
            <Text style={styles.countValue}>
              {isLoading || locLoading ? '…' : nearbyCount}
            </Text>
            <Text style={styles.countLabel}>
              {skillLabel
                ? t('browse.helpersAvailableSkill', { skill: skillLabel })
                : t('browse.helpersAvailable')}
            </Text>
          </View>
        </View>
        {nearbyCount === 0 ? (
          <Text style={styles.countHint}>
            {skillLabel
              ? t('browse.countHintNoSkill', { skill: skillLabel })
              : t('browse.countHintNoHelpers')}
          </Text>
        ) : null}
        <GradientButton
          title={
            skillLabel
              ? t('browse.requestSkillHelp', { skill: skillLabel })
              : t('browse.sendAreaRequestBtn')
          }
          onPress={() =>
            router.push({
              pathname: '/(main)/bookings/request',
              params: skill ? { skill } : undefined,
            })
          }
          disabled={!searchLocation}
          style={styles.countBtn}
        />
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { paddingBottom: 100 },
  header: { paddingTop: 56, paddingHorizontal: Stitch.spacing.padding, paddingBottom: 12 },
  title: {
    ...Stitch.typography.headline,
    fontSize: 26,
    lineHeight: 32,
    color: Stitch.colors.primary,
  },
  sub: {
    ...Stitch.typography.caption,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 6,
    lineHeight: 18,
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Stitch.colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Stitch.radius.pill,
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: '700',
    color: Stitch.colors.primary,
  },
  clearFilter: {
    fontSize: 13,
    fontWeight: '600',
    color: Stitch.colors.secondary,
  },
  liveLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Stitch.spacing.padding,
    marginBottom: 12,
    padding: 12,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.colors.surfaceLow,
  },
  liveLocText: { flex: 1, fontSize: 13, color: Stitch.colors.onSurfaceVariant },
  locErrorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Stitch.spacing.padding,
    marginBottom: 12,
    padding: 12,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.colors.errorContainer,
  },
  locError: {
    flex: 1,
    fontSize: 13,
    color: Stitch.colors.error,
  },
  broadcastBtn: {
    marginHorizontal: Stitch.spacing.padding,
    marginBottom: 16,
    padding: 16,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.colors.secondary,
  },
  broadcastBtnDisabled: { opacity: 0.55 },
  broadcastTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  broadcastSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4, lineHeight: 18 },
  broadcastBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Stitch.radius.pill,
  },
  broadcastBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Stitch.spacing.padding,
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: Stitch.radius.lg,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
  },
  search: { flex: 1, marginLeft: 8, fontSize: 16 },
  chipsSection: {
    marginBottom: 12,
  },
  chipsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Stitch.colors.onSurfaceVariant,
    marginHorizontal: Stitch.spacing.padding,
    marginBottom: 10,
  },
  chipsRow: { flexGrow: 0 },
  chipsContent: {
    paddingHorizontal: Stitch.spacing.padding,
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 44,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: Stitch.radius.pill,
    backgroundColor: Stitch.colors.surfaceContainer,
    marginRight: 10,
  },
  chipOn: { backgroundColor: Stitch.colors.secondary },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Stitch.colors.onSurfaceVariant,
    lineHeight: 18,
  },
  chipTextOn: { color: '#fff' },
  countCard: { marginHorizontal: Stitch.spacing.padding, marginTop: 8 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  countIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBody: { flex: 1 },
  countValue: { fontSize: 36, fontWeight: '700', color: Stitch.colors.primary },
  countLabel: { fontSize: 15, fontWeight: '600', color: Stitch.colors.onSurfaceVariant, marginTop: 2 },
  countHint: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 20,
    color: Stitch.colors.onSurfaceVariant,
  },
  countBtn: { marginTop: 16 },
  certRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: Stitch.spacing.padding,
    marginBottom: 12,
  },
  certChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Stitch.radius.pill,
    backgroundColor: Stitch.colors.surfaceContainer,
  },
  certChipOn: { backgroundColor: Stitch.colors.primaryFixed },
  certText: { fontSize: 13, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  certTextOn: { color: Stitch.colors.primary },
});
