import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import {
  formatVisitAddressLines,
  hasVisitAddressDetail,
  type VisitAddressParts,
} from '@/lib/visitAddress';

type Props = {
  parts: VisitAddressParts;
  title?: string;
};

export function VisitAddressBanner({ parts, title }: Props) {
  const { t } = useTranslation();
  const bannerTitle = title ?? t('bookings.visitAddress');
  const lines = formatVisitAddressLines(parts);
  if (!hasVisitAddressDetail(parts)) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <MaterialIcons name="home" size={18} color={Stitch.colors.primary} />
        <Text style={styles.title}>{bannerTitle}</Text>
      </View>
      {lines.map((line, i) => (
        <Text key={i} style={[styles.line, i === 0 && styles.linePrimary]}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    padding: 14,
    borderRadius: Stitch.radius.lg,
    backgroundColor: Stitch.colors.surfaceLow,
    borderWidth: 1,
    borderColor: Stitch.colors.outlineVariant,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 13, fontWeight: '700', color: Stitch.colors.primary },
  line: { fontSize: 13, color: Stitch.colors.onSurfaceVariant, lineHeight: 19 },
  linePrimary: { fontSize: 15, fontWeight: '600', color: Stitch.colors.onBackground },
});
