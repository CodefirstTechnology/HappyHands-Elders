import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '@/lib/api';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { LocationPicker } from '@/components/ui/LocationPicker';
import {
  AddressUnitFields,
  type AddressUnitValue,
} from '@/components/ui/AddressUnitFields';
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker';
import type { LocationValue } from '@/lib/locationTypes';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useAuthStore } from '@/store/authStore';
import { useSkills } from '@/hooks/useSkills';
import {
  formatSessionSlotsLabel,
  getAvailableTimeSlots,
  getDefaultTimeSlotsForDate,
  pruneTimeSlotsForDate,
  slotsToPayload,
  startOfLocalDay,
  type TimeSlot,
} from '@/lib/timeSlots';
import { localizedSkillLabel } from '@/lib/skills';
import { formatDate } from '@/lib/i18n/format';

export default function AreaBookingRequestScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { skill: skillParam } = useLocalSearchParams<{ skill?: string }>();
  const { data: skills = [] } = useSkills();
  const requestedSkillFromRoute = skillParam ? String(skillParam).toUpperCase() : undefined;
  const [selectedSkill, setSelectedSkill] = useState(requestedSkillFromRoute || '');
  const { location: liveLocation, loading: locLoading } = useLiveLocation();
  const [bookingType, setBookingType] = useState<'SESSION' | 'MONTHLY'>('SESSION');
  const [sessionDate, setSessionDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => getDefaultTimeSlotsForDate(new Date()));
  const [monthlyStart, setMonthlyStart] = useState(new Date());
  const [monthlyEnd, setMonthlyEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
  });
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [addressUnit, setAddressUnit] = useState<AddressUnitValue>({
    flatNo: '',
    building: '',
    area: '',
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);

  useEffect(() => {
    if (requestedSkillFromRoute) setSelectedSkill(requestedSkillFromRoute);
  }, [requestedSkillFromRoute]);

  useEffect(() => {
    if (liveLocation) setLocation(liveLocation);
  }, [liveLocation]);

  useEffect(() => {
    const ho = user?.familyClient;
    if (!ho) return;
    setAddressUnit({
      flatNo: ho.flatNo || '',
      building: ho.building || '',
      area: ho.area || '',
    });
  }, [user?.familyClient]);

  useEffect(() => {
    const syncSlots = () =>
      setTimeSlots((prev) => pruneTimeSlotsForDate(prev, sessionDate, new Date()));
    syncSlots();
    const timer = setInterval(syncSlots, 30000);
    return () => clearInterval(timer);
  }, [sessionDate]);

  const skillLabel = selectedSkill
    ? localizedSkillLabel(selectedSkill, skills)
    : '';

  const { data: nearbyHelpers = [] } = useQuery({
    queryKey: ['caregivers', selectedSkill, location?.latitude, location?.longitude],
    enabled:
      !!selectedSkill &&
      location?.latitude != null &&
      location?.longitude != null &&
      !Number.isNaN(location.latitude) &&
      !Number.isNaN(location.longitude),
    queryFn: async () => {
      const res = await api.get('/caregivers', {
        params: {
          skill: selectedSkill,
          latitude: location!.latitude,
          longitude: location!.longitude,
        },
      });
      return res.data.data.caregivers as { user: { name: string } }[];
    },
  });

  const nearbyCount = nearbyHelpers.length;
  const requestTypeLabel = bookingType === 'SESSION' ? t('common.oneVisit') : t('common.monthly');

  const slotsSummary = formatSessionSlotsLabel(
    JSON.stringify(slotsToPayload(timeSlots)),
    timeSlots[0]?.start,
    timeSlots[timeSlots.length - 1]?.end,
  );

  const submit = async () => {
    if (!selectedSkill) {
      Alert.alert(t('bookings.categoryRequired'), t('bookings.whatHelpNeed'));
      return;
    }

    let sessionSlotsToSend = timeSlots;
    if (bookingType === 'SESSION') {
      const available = getAvailableTimeSlots(sessionDate);
      sessionSlotsToSend = timeSlots.filter((s) => available.some((a) => a.id === s.id));
      if (sessionSlotsToSend.length === 0) {
        Alert.alert(t('bookings.timeSlotRequired'), t('timeSlots.noneLeftToday'));
        return;
      }
      if (sessionSlotsToSend.length !== timeSlots.length) {
        setTimeSlots(sessionSlotsToSend);
      }
    }

    if (!location?.address || location.latitude == null || location.longitude == null) {
      Alert.alert(t('validation.locationRequired'), t('bookings.locationRequiredShort'));
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        bookingType,
        address: location.address,
        flatNo: addressUnit.flatNo.trim() || undefined,
        building: addressUnit.building.trim() || undefined,
        area: addressUnit.area.trim() || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        notes: notes.trim() || undefined,
        requestedSkill: selectedSkill,
      };

      if (bookingType === 'SESSION') {
        const day = new Date(sessionDate);
        day.setHours(12, 0, 0, 0);
        const orderedSlots = slotsToPayload(sessionSlotsToSend);
        payload.sessionDate = day.toISOString();
        payload.sessionSlots = orderedSlots;
        payload.sessionStartTime = orderedSlots[0].start;
        payload.sessionEndTime = orderedSlots[orderedSlots.length - 1].end;
        payload.sessionHours = orderedSlots.length;
      } else {
        payload.monthlyStartDate = monthlyStart.toISOString();
        payload.monthlyEndDate = monthlyEnd.toISOString();
        payload.hoursPerDay = 8;
        payload.workingDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      }

      const res = await api.post('/bookings', payload);
      const notified = res.data.data.broadcast?.notifiedServants ?? 0;
      const timePreview =
        bookingType === 'SESSION' && slotsSummary
          ? `\n${t('bookings.timeSlotsPreview', { slots: slotsSummary })}`
          : '';
      Alert.alert(
        t('bookings.requestSentTitle'),
        `${skillLabel} · ${requestTypeLabel}${timePreview}\n\n${
          notified > 0
            ? t('bookings.notifiedHelpers', { count: notified })
            : t('bookings.requestSavedOffline')
        }`,
      );
      router.replace(`/(main)/bookings/${res.data.data.booking.id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert(t('bookings.requestFailed'), err.response?.data?.message || t('auth.tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← {t('common.back')}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{t('bookings.requestHelpArea')}</Text>
      <Text style={styles.sub}>{t('bookings.requestHelpSub')}</Text>

      <View style={styles.categoryBox}>
        <Text style={styles.categoryTitle}>{t('bookings.requestCategory')}</Text>
        <Text style={styles.categoryHint}>{t('bookings.whatHelpNeed')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.skillRow}
          contentContainerStyle={styles.skillRowContent}
        >
          {skills.map((s) => (
            <TouchableOpacity
              key={s.code}
              style={[styles.skillChip, selectedSkill === s.code && styles.skillChipOn]}
              onPress={() => setSelectedSkill(s.code)}
            >
              <Text style={[styles.skillChipText, selectedSkill === s.code && styles.skillChipTextOn]}>
                {localizedSkillLabel(s.code, skills)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {selectedSkill ? (
          <Text style={styles.categorySelected}>
            {t('bookings.sendingRequestFor', {
              skill: skillLabel,
              type: requestTypeLabel,
              slots:
                bookingType === 'SESSION' && slotsSummary ? ` · ${slotsSummary}` : '',
            })}
          </Text>
        ) : null}
      </View>

      {location?.latitude != null && location?.longitude != null && selectedSkill ? (
        <View style={styles.areaBox}>
          <Text style={styles.areaTitle}>
            {nearbyCount > 0
              ? t('bookings.nearbyHelpersNotify', { count: nearbyCount, skill: skillLabel })
              : t('bookings.noHelpersInAreaNow', { skill: skillLabel })}
          </Text>
          {nearbyCount === 0 ? (
            <Text style={styles.areaNames}>
              {t('bookings.requestStaysOpen', { skill: skillLabel })}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.toggle}>
        {(['SESSION', 'MONTHLY'] as const).map((bt) => (
          <TouchableOpacity
            key={bt}
            style={[styles.toggleBtn, bookingType === bt && styles.toggleOn]}
            onPress={() => setBookingType(bt)}
          >
            <Text style={[styles.toggleText, bookingType === bt && styles.toggleTextOn]}>
              {bt === 'SESSION' ? t('common.oneVisit') : t('common.monthly')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {bookingType === 'SESSION' ? (
        <>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(true)}>
            <Text style={styles.dateLabel}>{t('bookings.visitDate')}</Text>
            <Text style={styles.dateValue}>{formatDate(sessionDate)}</Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker
              value={sessionDate}
              mode="date"
              minimumDate={startOfLocalDay(new Date())}
              onChange={(_, d) => {
                setShowDate(false);
                if (d) setSessionDate(d);
              }}
            />
          )}
          <TimeSlotPicker
            label={t('bookings.pickTimeSlots')}
            value={timeSlots}
            onChange={setTimeSlots}
            sessionDate={sessionDate}
          />
        </>
      ) : (
        <Text style={styles.hint}>
          {t('bookings.monthlyRange', {
            start: formatDate(monthlyStart),
            end: formatDate(monthlyEnd),
          })}
        </Text>
      )}

      <AddressUnitFields value={addressUnit} onChange={setAddressUnit} />
      <LocationPicker
        label={t('bookings.liveLocationLabel')}
        placeholder={
          locLoading ? t('bookings.gettingLocation') : t('bookings.liveLocationPlaceholder')
        }
        value={location}
        onChange={setLocation}
      />
      <GhostInput label={t('bookings.notesOptional')} value={notes} onChangeText={setNotes} />

      <GradientButton
        title={
          nearbyCount > 0
            ? t('bookings.sendRequestToHelpers', {
                skill: skillLabel || t('bookings.areaRequest'),
                count: nearbyCount,
              })
            : selectedSkill
              ? t('bookings.sendSkillRequest', { skill: skillLabel })
              : t('bookings.selectCategoryToSend')
        }
        onPress={submit}
        loading={loading || locLoading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 52, paddingBottom: 40 },
  back: { color: Stitch.colors.primary, fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 8 },
  sub: { fontSize: 14, color: Stitch.colors.onSurfaceVariant, marginBottom: 20, lineHeight: 20 },
  categoryBox: {
    backgroundColor: Stitch.colors.primaryFixed,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  categoryTitle: { fontSize: 14, fontWeight: '700', color: Stitch.colors.primary },
  categoryHint: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginTop: 4 },
  skillRow: { marginTop: 12, flexGrow: 0 },
  skillRowContent: { alignItems: 'center', paddingVertical: 2 },
  skillChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Stitch.radius.pill,
    backgroundColor: Stitch.colors.surfaceContainer,
    marginRight: 8,
  },
  skillChipOn: { backgroundColor: Stitch.colors.secondary },
  skillChipText: { fontSize: 13, fontWeight: '600', color: Stitch.colors.onSurfaceVariant, lineHeight: 18 },
  skillChipTextOn: { color: '#fff' },
  categorySelected: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: Stitch.colors.primary,
    lineHeight: 18,
  },
  areaBox: {
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  areaTitle: { fontSize: 14, fontWeight: '700', color: Stitch.colors.primary },
  areaNames: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, marginTop: 6, lineHeight: 18 },
  toggle: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  toggleBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Stitch.colors.surfaceContainer,
    alignItems: 'center',
  },
  toggleOn: { backgroundColor: Stitch.colors.secondary },
  toggleText: { fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  toggleTextOn: { color: '#fff' },
  dateBtn: {
    backgroundColor: Stitch.colors.surfaceLow,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateLabel: { fontSize: 12, color: Stitch.colors.onSurfaceVariant },
  dateValue: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  hint: { marginBottom: 16, color: Stitch.colors.onSurfaceVariant },
});
