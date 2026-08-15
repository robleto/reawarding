import { isNativeApp } from '@/lib/platform';

// Haptic vocabulary for the core loop (see docs/IPHONE_FEEL_AUDIT.md item 9).
// Every call is a no-op on web; the plugin is only imported inside the
// native shell, mirroring the NativeStatusBarBridge dynamic-import pattern.
// Failures are swallowed — a missed haptic must never break an interaction.

// ─── TEMPORARY DIAGNOSTIC — remove once the device failure is identified ────
// Set to false (or delete the debugAlert calls) to silence.
//
// Gated on the user-agent token from capacitor.config.ts `appendUserAgent`,
// NOT on Capacitor.isNativePlatform() — the JS bridge is itself a suspect
// here, so the gate must not depend on it. This also guarantees visitors to
// reawarding.com in a normal browser never see these alerts.
const HAPTIC_DEBUG = true;

function inAppShell(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('ReawardingApp');
}

function debugAlert(message: string): void {
  if (HAPTIC_DEBUG && inAppShell()) {
    // eslint-disable-next-line no-alert
    alert(message);
  }
}
// ───────────────────────────────────────────────────────────────────────────

type HapticKind = 'light' | 'medium' | 'success';

async function fire(kind: HapticKind): Promise<void> {
  let stage = 'start';
  try {
    const { Capacitor } = await import('@capacitor/core');
    const native = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    stage = `native=${native} platform=${platform}`;

    if (!isNativeApp()) {
      debugAlert(`[haptics] SKIPPED before call — ${stage}`);
      return;
    }

    stage += ` pluginAvailable=${Capacitor.isPluginAvailable?.('Haptics')}`;

    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    stage += ' importOK';

    if (kind === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      await Haptics.impact({
        style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light,
      });
    }

    debugAlert(`[haptics] CALL SUCCEEDED (${kind}) — ${stage}`);
  } catch (err) {
    debugAlert(`[haptics] THREW (${kind}) — ${stage} — ${String(err)}`);
  }
}

/** Small tick — tab changes, picking a rating row, toggling Seen It. */
export async function hapticLight(): Promise<void> {
  return fire('light');
}

/** Firmer thunk — a film emerging as a nominee. */
export async function hapticMedium(): Promise<void> {
  return fire('medium');
}

/** Success notification — setting a year's winner. */
export async function hapticSuccess(): Promise<void> {
  return fire('success');
}
