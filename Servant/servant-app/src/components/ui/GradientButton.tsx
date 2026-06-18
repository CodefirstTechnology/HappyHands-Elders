import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stitch } from '@/theme/stitch';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  variant?: 'gradient' | 'outline';
};

export function GradientButton({
  title,
  onPress,
  disabled,
  loading,
  style,
  variant = 'gradient',
}: Props) {
  if (variant === 'outline') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.outline,
          pressed && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Stitch.colors.secondary} />
        ) : (
          <Text style={styles.outlineText}>{title}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [pressed && styles.pressed, style]}
    >
      <LinearGradient
        colors={[Stitch.colors.gradientStart, Stitch.colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, disabled && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    height: 56,
    borderRadius: Stitch.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Stitch.colors.gradientEnd,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pressed: { transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  outline: {
    height: 56,
    borderRadius: Stitch.radius.lg,
    borderWidth: 1.5,
    borderColor: Stitch.colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Stitch.colors.surfaceHighest,
  },
  outlineText: { color: Stitch.colors.primary, fontSize: 16, fontWeight: '600' },
});
