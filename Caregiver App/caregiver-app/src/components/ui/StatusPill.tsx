import { View, Text, StyleSheet } from 'react-native';
import { StatusColors } from '@/theme/stitch';
import { translateStatus } from '@/lib/i18n';

export function StatusPill({ status }: { status: string }) {
  const c = StatusColors[status] || {
    bg: '#f0ecf5',
    text: '#464652',
  };
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>{translateStatus(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  text: { fontSize: 12, fontWeight: '600' },
});
