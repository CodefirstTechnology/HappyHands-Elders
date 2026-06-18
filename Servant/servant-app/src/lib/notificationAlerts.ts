import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { localizeNotification, type NotificationPayload } from '@/lib/i18n/notifications';

const BOOKING_REQUEST_CHANNEL = 'booking-requests';

let initialized = false;
let notificationsModule: typeof import('expo-notifications') | null = null;

/** Expo Go (SDK 53+) cannot load expo-notifications — use haptics/vibration only. */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

async function getNotifications() {
  if (Platform.OS === 'web' || isExpoGo()) return null;

  if (!notificationsModule) {
    notificationsModule = await import('expo-notifications');
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  return notificationsModule;
}

export const BOOKING_REQUEST_TYPES = new Set(['BOOKING_OPEN', 'BOOKING_CREATED']);

export async function initNotificationAlerts(): Promise<boolean> {
  if (initialized) return !isExpoGo();

  initialized = true;

  if (Platform.OS === 'web' || isExpoGo()) return false;

  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(BOOKING_REQUEST_CHANNEL, {
      name: 'Booking requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      sound: 'default',
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  return finalStatus === 'granted';
}

export async function alertBookingRequest(notification: NotificationPayload): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Haptics unavailable on some devices
  }

  if (isExpoGo()) {
    if (Platform.OS === 'android') {
      try {
        Vibration.vibrate([0, 400, 200, 400]);
      } catch {
        // Ignore
      }
    }
    return;
  }

  const Notifications = await getNotifications();
  if (!Notifications) return;

  const { title, body } = localizeNotification(notification);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: notification.data ?? {},
        ...(Platform.OS === 'android' ? { channelId: BOOKING_REQUEST_CHANNEL } : {}),
      },
      trigger: null,
    });
  } catch {
    // Permission denied or unsupported runtime
  }
}
