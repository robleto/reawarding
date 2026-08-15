import { isNativeApp } from '@/lib/platform';

// Haptic vocabulary for the core loop (see docs/IPHONE_FEEL_AUDIT.md item 9).
// Every call is a no-op on web; the plugin is only imported inside the
// native shell, mirroring the NativeStatusBarBridge dynamic-import pattern.
// Failures are swallowed — a missed haptic must never break an interaction.

/** Small tick — tab changes, picking a rating row, toggling Seen It. */
export async function hapticLight(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* no-op */
  }
}

/** Firmer thunk — a film emerging as a nominee. */
export async function hapticMedium(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* no-op */
  }
}

/** Success notification — setting a year's winner. */
export async function hapticSuccess(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* no-op */
  }
}
