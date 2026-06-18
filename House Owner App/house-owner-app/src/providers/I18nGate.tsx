import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import { Stitch } from '@/theme/stitch';

export function I18nGate({ children }: { children: React.ReactNode }) {
  const { isReady, init } = useLanguageStore();

  useEffect(() => {
    void init();
  }, [init]);

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Stitch.colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Stitch.colors.background,
  },
});
