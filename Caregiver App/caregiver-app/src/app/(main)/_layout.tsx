import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Stitch } from '@/theme/stitch';
import { useBookingRequestAlerts } from '@/hooks/useBookingRequestAlerts';
import { usePendingRequestVibration } from '@/hooks/usePendingRequestVibration';

export default function MainLayout() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuthStore();
  useBookingRequestAlerts();
  usePendingRequestVibration();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Stitch.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Stitch.colors.secondary,
        tabBarInactiveTintColor: Stitch.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: 'rgba(252, 248, 255, 0.95)',
          borderTopColor: 'rgba(255,255,255,0.5)',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: t('tabs.schedule'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-today" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="time"
        options={{
          title: t('tabs.time'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="schedule" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings/index"
        options={{
          title: t('tabs.earnings'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-balance-wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="zones/index" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
    </Tabs>
  );
}
