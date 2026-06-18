import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import {
  AddressUnitFields,
  type AddressUnitValue,
} from '@/components/ui/AddressUnitFields';
import { updateHomeLocation, type MobilityLevel } from '@/lib/geo';
import { mapsDeepLink, type LocationValue } from '@/lib/locationTypes';
import { MOBILITY_LEVELS } from '@/constants/elderCare';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout, setUser } = useAuthStore();
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [addressUnit, setAddressUnit] = useState<AddressUnitValue>({
    flatNo: '',
    building: '',
    area: '',
  });
  const [saving, setSaving] = useState(false);
  const [eldersCount, setEldersCount] = useState('');
  const [elderAgeRange, setElderAgeRange] = useState('');
  const [mobilityLevel, setMobilityLevel] = useState<MobilityLevel | ''>('');
  const [medicalNotes, setMedicalNotes] = useState('');

  useEffect(() => {
    const fc = user?.familyClient;
    if (fc?.latitude != null && fc?.longitude != null && fc.address) {
      setLocation({
        address: fc.address,
        city: fc.city,
        latitude: fc.latitude,
        longitude: fc.longitude,
        flatNo: fc.flatNo,
        building: fc.building,
        area: fc.area,
      });
    }
    if (fc) {
      setAddressUnit({
        flatNo: fc.flatNo || '',
        building: fc.building || '',
        area: fc.area || '',
      });
      setEldersCount(fc.eldersCount != null ? String(fc.eldersCount) : '');
      setElderAgeRange(fc.elderAgeRange || '');
      setMobilityLevel((fc.mobilityLevel as MobilityLevel) || '');
      setMedicalNotes(fc.medicalNotes || '');
    }
  }, [user?.familyClient]);

  const saveLocation = async () => {
    if (!location) {
      Alert.alert(t('validation.locationRequired'), t('validation.pickHomeFirst'));
      return;
    }
    setSaving(true);
    try {
      const { user: updatedUser } = await updateHomeLocation({
        address: location.address,
        flatNo: addressUnit.flatNo.trim() || undefined,
        building: addressUnit.building.trim() || undefined,
        area: addressUnit.area.trim() || undefined,
        city: location.city || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        eldersCount: eldersCount ? Number(eldersCount) : undefined,
        elderAgeRange: elderAgeRange.trim() || undefined,
        mobilityLevel: mobilityLevel || undefined,
        medicalNotes: medicalNotes.trim() || undefined,
      });
      setUser(updatedUser as typeof user);
      Alert.alert(t('success.saved'), t('success.homeLocationUpdated'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(t('errors.generic'), err.response?.data?.message || t('errors.couldNotSave'));
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const openMaps = () => {
    if (!location) return;
    Linking.openURL(
      mapsDeepLink(location.latitude, location.longitude, location.address || undefined),
    );
  };

  const initial = user?.name?.trim()?.[0]?.toUpperCase() || '?';
  const displayCity = user?.familyClient?.city || location?.city;

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
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={14} color={Stitch.colors.success} />
          </View>
        </View>
        <Text style={styles.heroName} numberOfLines={2}>
          {user?.name || t('profile.familyClient')}
        </Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{t('profile.familyClient')}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialIcons name="mail-outline" size={16} color="rgba(255,255,255,0.85)" />
          <Text style={styles.metaText} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
        {displayCity ? (
          <View style={styles.cityPill}>
            <MaterialIcons name="location-on" size={14} color="#fff" />
            <Text style={styles.cityPillText}>{displayCity}</Text>
          </View>
        ) : null}
      </LinearGradient>

      <GlassCard style={styles.languageCard}>
        <LanguageSelector showTitle />
      </GlassCard>

      <GlassCard style={styles.locationCard}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="elderly" size={22} color={Stitch.colors.secondary} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>{t('profile.eldersInfo')}</Text>
            <Text style={styles.sectionSub}>{t('profile.eldersInfoSub')}</Text>
          </View>
        </View>
        <GhostInput
          label={t('profile.eldersCount')}
          value={eldersCount}
          onChangeText={setEldersCount}
          keyboardType="number-pad"
        />
        <GhostInput
          label={t('profile.elderAgeRange')}
          value={elderAgeRange}
          onChangeText={setElderAgeRange}
          placeholder={t('profile.elderAgeRangePlaceholder')}
        />
        <Text style={styles.hint}>{t('profile.elderAgeRangeHint')}</Text>
        <Text style={styles.fieldLabel}>{t('profile.mobilityLevel')}</Text>
        <View style={styles.mobilityRow}>
          {MOBILITY_LEVELS.map(({ value, labelKey }) => {
            const selected = mobilityLevel === value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.mobilityChip, selected && styles.mobilityChipOn]}
                onPress={() => setMobilityLevel(selected ? '' : (value as MobilityLevel))}
              >
                <Text style={[styles.mobilityChipText, selected && styles.mobilityChipTextOn]}>
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <GhostInput
          label={t('profile.medicalNotes')}
          value={medicalNotes}
          onChangeText={setMedicalNotes}
          placeholder={t('profile.medicalNotesPlaceholder')}
          multiline
        />
      </GlassCard>

      <GlassCard style={styles.locationCard}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="home" size={22} color={Stitch.colors.secondary} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>{t('profile.homeLocation')}</Text>
            <Text style={styles.sectionSub}>{t('profile.homeLocationSub')}</Text>
          </View>
        </View>

        <AddressUnitFields value={addressUnit} onChange={setAddressUnit} />
        <LocationPicker
          placeholder={t('auth.searchPlaceholder')}
          value={location}
          onChange={setLocation}
          height={200}
        />

        {location ? (
          <TouchableOpacity style={styles.mapsLink} onPress={openMaps} activeOpacity={0.85}>
            <MaterialIcons name="map" size={18} color={Stitch.colors.primary} />
            <Text style={styles.mapsLinkText}>{t('common.openMaps')}</Text>
            <MaterialIcons name="open-in-new" size={16} color={Stitch.colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : null}
      </GlassCard>

      <GradientButton
        title={saving ? t('common.saving') : t('profile.saveHomeLocation')}
        onPress={saveLocation}
        loading={saving}
        style={styles.saveBtn}
      />

      <GradientButton
        title={t('auth.signOut')}
        variant="outline"
        onPress={signOut}
        style={styles.signOutBtn}
      />
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
    marginBottom: 20,
    shadowColor: Stitch.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
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
    borderColor: Stitch.colors.primary,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Stitch.radius.pill,
    marginBottom: 14,
  },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    maxWidth: '100%',
    paddingHorizontal: 8,
  },
  metaText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, flexShrink: 1 },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Stitch.radius.pill,
  },
  cityPillText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  languageCard: { marginBottom: 16 },
  locationCard: { marginBottom: 16 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Stitch.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadText: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Stitch.colors.onBackground },
  sectionSub: {
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Stitch.colors.onBackground,
    marginBottom: 8,
  },
  mobilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  mobilityChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Stitch.radius.pill,
    backgroundColor: Stitch.colors.surfaceContainer,
  },
  mobilityChipOn: { backgroundColor: Stitch.colors.secondary },
  mobilityChipText: { fontSize: 13, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  mobilityChipTextOn: { color: '#fff' },
  hint: {
    fontSize: 12,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: -8,
    marginBottom: 12,
    lineHeight: 16,
  },
  mapsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Stitch.radius.md,
    backgroundColor: Stitch.colors.surfaceLow,
    alignSelf: 'flex-start',
  },
  mapsLinkText: { color: Stitch.colors.primary, fontWeight: '600', fontSize: 14 },
  saveBtn: { marginBottom: 12 },
  signOutBtn: { marginTop: 4 },
});
