import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stitch } from '@/theme/stitch';
import { GlassCard } from '@/components/ui/GlassCard';

type Props = {
  code: string;
  helperName?: string;
};

export function WorkStartOtpCard({ code, helperName }: Props) {
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.kicker}>{t('workOtp.homeKicker')}</Text>
      <Text style={styles.title}>{t('workOtp.homeTitle')}</Text>
      {helperName ? (
        <Text style={styles.helper}>{t('workOtp.homeHelper', { name: helperName })}</Text>
      ) : null}
      <View style={styles.codeBox}>
        <Text style={styles.code}>{code}</Text>
      </View>
      <Text style={styles.hint}>{t('workOtp.homeHint')}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Stitch.colors.secondary,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: Stitch.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.primary,
    marginTop: 4,
  },
  helper: {
    fontSize: 14,
    color: Stitch.colors.onSurfaceVariant,
    marginTop: 6,
  },
  codeBox: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Stitch.colors.primaryFixed,
  },
  code: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
    color: Stitch.colors.primary,
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    lineHeight: 18,
  },
});
