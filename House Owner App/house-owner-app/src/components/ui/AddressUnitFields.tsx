import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GhostInput } from '@/components/ui/GhostInput';

export type AddressUnitValue = {
  flatNo: string;
  building: string;
  area: string;
};

type Props = {
  value: AddressUnitValue;
  onChange: (next: AddressUnitValue) => void;
};

export function AddressUnitFields({ value, onChange }: Props) {
  const { t } = useTranslation();
  const set = (key: keyof AddressUnitValue, text: string) =>
    onChange({ ...value, [key]: text });

  return (
    <View style={styles.wrap}>
      <GhostInput
        label={t('profile.flatNo')}
        value={value.flatNo}
        onChangeText={(txt) => set('flatNo', txt)}
      />
      <GhostInput
        label={t('profile.building')}
        value={value.building}
        onChangeText={(txt) => set('building', txt)}
      />
      <GhostInput
        label={t('profile.area')}
        value={value.area}
        onChangeText={(txt) => set('area', txt)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
});
