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
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { GradientButton } from '@/components/ui/GradientButton';
import { GhostInput } from '@/components/ui/GhostInput';
import { LocationPicker } from '@/components/ui/LocationPicker';
import {
  AddressUnitFields,
  type AddressUnitValue,
} from '@/components/ui/AddressUnitFields';
import type { LocationValue } from '@/lib/locationTypes';
import { formatDate, formatCurrency } from '@/lib/i18n/format';

export default function NewBookingScreen() {
  const { t } = useTranslation();
  const { caregiverId } = useLocalSearchParams<{ caregiverId: string }>();
  const user = useAuthStore((s) => s.user);
  const [bookingType, setBookingType] = useState<'SESSION' | 'MONTHLY'>('SESSION');
  const [sessionDate, setSessionDate] = useState(new Date());
  const [sessionStart, setSessionStart] = useState('09:00');
  const [sessionEnd, setSessionEnd] = useState('13:00');
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
    const ho = user?.parent;
    if (ho?.latitude != null && ho?.longitude != null && ho.address) {
      setLocation({
        address: ho.address,
        city: ho.city,
        latitude: ho.latitude,
        longitude: ho.longitude,
        flatNo: ho.flatNo,
        building: ho.building,
        area: ho.area,
      });
    }
    if (ho) {
      setAddressUnit({
        flatNo: ho.flatNo || '',
        building: ho.building || '',
        area: ho.area || '',
      });
    }
  }, [user?.parent]);

  const { data: servant } = useQuery({
    queryKey: ['caregiver', servantId],
    enabled: !!caregiverId,
    queryFn: async () => {
      const res = await api.get(`/caregivers/${caregiverId}`);
      return res.data.data.caregiver;
    },
  });

  const totalAmount =
    bookingType === 'SESSION'
      ? (servant?.hourlyRate || 0) *
        Math.max(
          1,
          (parseInt(sessionEnd.split(':')[0], 10) || 0) -
            (parseInt(sessionStart.split(':')[0], 10) || 0),
        )
      : servant?.monthlyRate || 0;

  const submit = async () => {
    if (!servantId) {
      Alert.alert(t('bookings.requestFailed'), t('bookings.selectHelperFirst'));
      return;
    }
    if (!location?.address) {
      Alert.alert(t('validation.locationRequired'), t('bookings.visitLocationRequired'));
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        caregiverId: Number(caregiverId),
        bookingType,
        address: location.address,
        flatNo: addressUnit.flatNo.trim() || undefined,
        building: addressUnit.building.trim() || undefined,
        area: addressUnit.area.trim() || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        notes: notes.trim() || undefined,
        totalAmount: totalAmount || undefined,
      };

      if (bookingType === 'SESSION') {
        const day = new Date(sessionDate);
        day.setHours(12, 0, 0, 0);
        payload.sessionDate = day.toISOString();
        payload.sessionStartTime = sessionStart;
        payload.sessionEndTime = sessionEnd;
        payload.sessionHours = Math.max(
          1,
          (parseInt(sessionEnd.split(':')[0], 10) || 0) -
            (parseInt(sessionStart.split(':')[0], 10) || 0),
        );
      } else {
        payload.monthlyStartDate = monthlyStart.toISOString();
        payload.monthlyEndDate = monthlyEnd.toISOString();
        payload.hoursPerDay = 8;
        payload.workingDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      }

      const res = await api.post('/bookings', payload);
      Alert.alert(t('bookings.requestSent'), t('bookings.requestSentSub'));
      router.replace(`/(main)/bookings/${res.data.data.booking.id}`);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      const message = err.response?.data?.message || t('auth.tryAgain');
      const title =
        err.response?.status === 409
          ? t('bookings.timeNotAvailable')
          : t('bookings.bookingFailed');
      const buttons =
        err.response?.status === 409
          ? [
              { text: t('bookings.changeTime'), style: 'cancel' as const },
              {
                text: t('bookings.myBookings'),
                onPress: () => router.push('/(main)/bookings'),
              },
            ]
          : [{ text: t('common.confirm') }];
      Alert.alert(title, message, buttons);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← {t('common.back')}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>
        {t('bookings.bookHelperTitle', { name: servant?.user?.name || t('common.helper') })}
      </Text>

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
              onChange={(_, d) => {
                setShowDate(false);
                if (d) setSessionDate(d);
              }}
            />
          )}
          <GhostInput label={t('bookings.startTime')} value={sessionStart} onChangeText={setSessionStart} />
          <GhostInput label={t('bookings.endTime')} value={sessionEnd} onChangeText={setSessionEnd} />
        </>
      ) : (
        <>
          <Text style={styles.hint}>
            {t('bookings.monthlyRange', {
              start: formatDate(monthlyStart),
              end: formatDate(monthlyEnd),
            })}
          </Text>
        </>
      )}

      <AddressUnitFields value={addressUnit} onChange={setAddressUnit} />
      <LocationPicker
        label={t('bookings.visitLocation')}
        placeholder={t('bookings.visitLocationPlaceholder')}
        value={location}
        onChange={setLocation}
      />
      <GhostInput label={t('bookings.notesOptional')} value={notes} onChangeText={setNotes} />

      <Text style={styles.estimate}>
        {t('bookings.estimated', {
          amount: `${Stitch.copy.rupee}${formatCurrency(totalAmount)}`,
        })}
      </Text>

      <GradientButton title={t('bookings.sendBookingRequest')} onPress={submit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Stitch.colors.background },
  scroll: { padding: Stitch.spacing.padding, paddingTop: 52, paddingBottom: 40 },
  back: { color: Stitch.colors.primary, fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Stitch.colors.primary, marginBottom: 20 },
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
  estimate: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.secondary,
    marginVertical: 16,
    textAlign: 'center',
  },
});
