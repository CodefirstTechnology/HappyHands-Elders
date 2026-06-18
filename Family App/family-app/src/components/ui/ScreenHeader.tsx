import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { NotificationBell } from '@/components/ui/NotificationBell';

type Props = {
  locationLabel?: string;
  location?: string;
  title?: string;
  onProfile?: () => void;
  onLocationPress?: () => void;
  unreadNotifications?: number;
  onNotifications?: () => void;
};

export function ScreenHeader({
  locationLabel,
  location = 'Mumbai, India',
  title,
  onProfile,
  onLocationPress,
  unreadNotifications = 0,
  onNotifications,
}: Props) {
  const { t } = useTranslation();
  const resolvedLocationLabel = locationLabel ?? t('common.yourArea');
  const locationContent = (
    <>
      <MaterialIcons name="location-on" size={22} color={Stitch.colors.primary} />
      <View style={styles.locTextWrap}>
        <Text style={styles.locLabel}>{resolvedLocationLabel}</Text>
        <Text style={styles.locValue} numberOfLines={2}>
          {location}
        </Text>
      </View>
      {onLocationPress ? (
        <MaterialIcons name="chevron-right" size={20} color={Stitch.colors.onSurfaceVariant} />
      ) : null}
    </>
  );

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        {onLocationPress ? (
          <Pressable
            onPress={onLocationPress}
            style={({ pressed }) => [styles.loc, pressed && styles.locPressed]}
            hitSlop={4}
          >
            {locationContent}
          </Pressable>
        ) : (
          <View style={styles.loc}>{locationContent}</View>
        )}
        <View style={styles.actions}>
          {onNotifications ? (
            <NotificationBell unread={unreadNotifications} onPress={onNotifications} />
          ) : null}
          {title ? (
            <Text style={styles.brand}>{title}</Text>
          ) : (
            <Pressable onPress={onProfile} style={styles.avatar}>
              <MaterialIcons name="person" size={22} color={Stitch.colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Stitch.spacing.padding,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: 'rgba(252, 248, 255, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 4,
    paddingRight: 8,
  },
  locPressed: { opacity: 0.75 },
  locTextWrap: { flex: 1 },
  locLabel: { ...Stitch.typography.caption, color: Stitch.colors.onSurfaceVariant },
  locValue: { ...Stitch.typography.label, color: Stitch.colors.onBackground },
  brand: { ...Stitch.typography.headline, color: Stitch.colors.primary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Stitch.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Stitch.colors.outlineVariant,
  },
});
