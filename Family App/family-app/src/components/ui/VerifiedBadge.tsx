import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const VERIFIED_BLUE = '#1D9BF0';

type Props = {
  showLabel?: boolean;
  size?: 'sm' | 'md';
};

export function VerifiedBadge({ showLabel = true, size = 'sm' }: Props) {
  const { t } = useTranslation();
  const iconSize = size === 'md' ? 18 : 14;
  const fontSize = size === 'md' ? 13 : 11;

  return (
    <View style={[styles.wrap, size === 'md' && styles.wrapMd]}>
      <MaterialIcons name="verified" size={iconSize} color={VERIFIED_BLUE} />
      {showLabel ? (
        <Text style={[styles.label, { fontSize }]}>{t('verification.verified')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(29, 155, 240, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  wrapMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  label: {
    color: VERIFIED_BLUE,
    fontWeight: '700',
  },
});
