import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';
import { useLanguageStore } from '@/store/languageStore';
import type { AppLanguage } from '@/lib/i18n';

const LANGUAGES: AppLanguage[] = ['en', 'hi', 'mr'];

type Props = {
  compact?: boolean;
  showTitle?: boolean;
};

export function LanguageSelector({ compact = false, showTitle = true }: Props) {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {showTitle ? (
        <>
          <Text style={styles.title}>{t('language.title')}</Text>
          {!compact ? <Text style={styles.sub}>{t('language.subtitle')}</Text> : null}
        </>
      ) : null}
      <View style={styles.row}>
        {LANGUAGES.map((code) => {
          const active = language === code;
          return (
            <Pressable
              key={code}
              onPress={() => void setLanguage(code)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {active ? (
                <MaterialIcons name="check" size={16} color={Stitch.colors.onPrimary} style={styles.check} />
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(`language.${code}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  wrapCompact: { marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: Stitch.colors.onBackground, marginBottom: 4 },
  sub: { fontSize: 12, color: Stitch.colors.onSurfaceVariant, marginBottom: 12, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Stitch.radius.pill,
    backgroundColor: Stitch.colors.surfaceLow,
    borderWidth: 1,
    borderColor: Stitch.colors.outlineVariant,
  },
  chipActive: {
    backgroundColor: Stitch.colors.primary,
    borderColor: Stitch.colors.primary,
  },
  check: { marginRight: 4 },
  chipText: { fontSize: 14, fontWeight: '600', color: Stitch.colors.onSurfaceVariant },
  chipTextActive: { color: Stitch.colors.onPrimary },
});
