import { Pressable, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';

type Props = {
  unread?: number;
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
};

export function NotificationBell({ unread = 0, onPress, size = 22, style }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, style]} hitSlop={10}>
      <MaterialIcons name="notifications" size={size} color={Stitch.colors.primary} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Stitch.colors.gradientStart,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
