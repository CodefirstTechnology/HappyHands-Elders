import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Android: pause, vibrate, pause, vibrate — repeats until cancelled */
const ANDROID_PATTERN = [0, 450, 250, 450];
const IOS_PULSE_MS = 2400;

let active = false;
let iosPulseTimer: ReturnType<typeof setInterval> | null = null;

async function iosPulse() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Simulator or unsupported device
  }
}

export function syncPendingRequestVibration(shouldVibrate: boolean) {
  if (Platform.OS === 'web') return;

  if (shouldVibrate) {
    if (active) return;
    active = true;

    if (Platform.OS === 'android') {
      Vibration.vibrate(ANDROID_PATTERN, true);
      return;
    }

    void iosPulse();
    iosPulseTimer = setInterval(() => void iosPulse(), IOS_PULSE_MS);
    return;
  }

  stopPendingRequestVibration();
}

export function stopPendingRequestVibration() {
  if (Platform.OS === 'web') return;

  active = false;
  Vibration.cancel();

  if (iosPulseTimer) {
    clearInterval(iosPulseTimer);
    iosPulseTimer = null;
  }
}

/** Stop alert vibration and give short success feedback when a request is accepted. */
export async function vibrateBookingAccepted() {
  if (Platform.OS === 'web') return;

  stopPendingRequestVibration();

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics unavailable
  }

  if (Platform.OS === 'android') {
    try {
      Vibration.vibrate(180);
    } catch {
      // Ignore
    }
  }
}
