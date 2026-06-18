import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Stitch } from '@/theme/stitch';
import type { Skill } from '@/hooks/useSkills';

type Props = {
  label: string;
  placeholder: string;
  skills: Skill[];
  loading?: boolean;
  value: string[];
  onChange: (codes: string[]) => void;
};

export function SkillSelect({ label, placeholder, skills, loading, value, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const toggle = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
    } else {
      onChange([...value, code]);
    }
  };

  const remove = (code: string) => onChange(value.filter((c) => c !== code));

  const summary =
    value.length === 0
      ? placeholder
      : value
          .map((code) => skills.find((s) => s.code === code)?.label || code.replace(/_/g, ' '))
          .join(', ');

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.trigger}
        onPress={() => !loading && skills.length > 0 && setOpen(true)}
        disabled={loading || skills.length === 0}
      >
        {loading ? (
          <ActivityIndicator color={Stitch.colors.primary} />
        ) : (
          <Text
            style={[styles.triggerText, value.length === 0 && styles.placeholder]}
            numberOfLines={2}
          >
            {summary}
          </Text>
        )}
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      {value.length > 0 ? (
        <View style={styles.chips}>
          {value.map((code) => {
            const itemLabel = skills.find((s) => s.code === code)?.label || code;
            return (
              <Pressable key={code} style={styles.chip} onPress={() => remove(code)}>
                <Text style={styles.chipText}>{itemLabel}</Text>
                <Text style={styles.chipRemove}>×</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <Text style={styles.sheetHint}>{t('auth.selectSkillsHint')}</Text>
          <FlatList
            data={skills}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const selected = value.includes(item.code);
              return (
                <Pressable
                  style={[styles.option, selected && styles.optionOn]}
                  onPress={() => toggle(item.code)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextOn]}>
                    {item.label}
                  </Text>
                  {selected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            }}
          />
          <Pressable style={styles.done} onPress={() => setOpen(false)}>
            <Text style={styles.doneText}>{t('common.done')}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Stitch.spacing.gutter },
  label: {
    ...Stitch.typography.caption,
    color: Stitch.colors.onSurfaceVariant,
    marginBottom: 6,
    marginLeft: 4,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Stitch.colors.surfaceLow,
    borderRadius: Stitch.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 52,
  },
  triggerText: { fontSize: 16, color: Stitch.colors.onBackground, flex: 1 },
  placeholder: { color: Stitch.colors.onSurfaceVariant + '99' },
  chevron: { fontSize: 14, color: Stitch.colors.onSurfaceVariant, marginLeft: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Stitch.colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, color: Stitch.colors.primary, fontWeight: '600' },
  chipRemove: { fontSize: 14, color: Stitch.colors.primary, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Stitch.colors.surfaceHighest,
    borderTopLeftRadius: Stitch.radius.xl,
    borderTopRightRadius: Stitch.radius.xl,
    maxHeight: '60%',
    paddingBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Stitch.colors.primary,
    paddingHorizontal: Stitch.spacing.padding,
    paddingTop: Stitch.spacing.padding,
    paddingBottom: 4,
  },
  sheetHint: {
    fontSize: 13,
    color: Stitch.colors.onSurfaceVariant,
    paddingHorizontal: Stitch.spacing.padding,
    paddingBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Stitch.spacing.padding,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Stitch.colors.outlineVariant,
  },
  optionOn: { backgroundColor: Stitch.colors.primaryFixed },
  optionText: { fontSize: 16, color: Stitch.colors.onBackground, flex: 1 },
  optionTextOn: { color: Stitch.colors.primary, fontWeight: '600' },
  check: { fontSize: 18, color: Stitch.colors.primary, fontWeight: '700' },
  done: {
    marginHorizontal: Stitch.spacing.padding,
    marginTop: 8,
    backgroundColor: Stitch.colors.primary,
    borderRadius: Stitch.radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
