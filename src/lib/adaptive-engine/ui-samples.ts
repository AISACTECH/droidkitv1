// =====================================================================
// FRP Adaptive Engine — UI screen sample library (WBS A2-1.1 / A2-1.2)
// ---------------------------------------------------------------------
// Curated, version-tagged FRP screen samples (condensed uiautomator-dump
// text) per OEM. These are the data the classifier tests and the flow
// maps are calibrated against — and the format the "rapid script
// refinement" tool extends when a bench records a new unknown dialog.
// =====================================================================

import type { BrandId, FsmStateId } from "./types.ts";

export interface UiSample {
  id: string;
  brand: BrandId;
  version: string; // "Android 13 / One UI 5" style
  dump: string;
  expected: FsmStateId;
}

export const UI_SAMPLES: UiSample[] = [
  {
    id: "samsung-a14-frp",
    brand: "samsung",
    version: "Android 14 / One UI 6",
    dump:
      'activity="com.google.android.gsf.login" text="This device was reset. To continue, sign in with a Google Account that was previously synced on this device." ' +
      'text="Forgot email?" text="Emergency Call"',
    expected: "google_verify",
  },
  {
    id: "samsung-testmenu",
    brand: "samsung",
    version: "Android 13 / One UI 5",
    dump:
      'activity="com.sec.android.app.hwmoduletest" text="RED" text="GREEN" text="BLUE" text="RECEIVER" ' +
      'text="VIBRATION" text="DIM LIGHT"',
    expected: "test_mode_menu",
  },
  {
    id: "samsung-rsa",
    brand: "samsung",
    version: "any",
    dump:
      'activity="com.android.systemui" text="Allow USB debugging?" text="RSA key fingerprint"' +
      'text="Always allow from this computer"',
    expected: "rsa_prompt",
  },
  {
    id: "pixel-verify",
    brand: "google",
    version: "Android 16",
    dump:
      'activity="com.google.android.setupwizard" text="Verify your account" text="Enter your password" ' +
      'text="This device was reset. To continue, sign in with a Google Account that was previously synced."',
    expected: "google_verify",
  },
  {
    id: "pixel-email",
    brand: "google",
    version: "Android 15",
    dump: 'activity="com.google.android.gsf.login" text="Enter your email" text="Email or phone"',
    expected: "account_email",
  },
  {
    id: "transsion-welcome",
    brand: "transsion",
    version: "Android 14 / HiOS",
    dump: 'activity="com.transsion.setupwizard" text="Hi there" text="Get started" text="Network setup"',
    expected: "welcome",
  },
  {
    id: "xiaomi-hyperos-frp",
    brand: "xiaomi",
    version: "Android 14 / HyperOS",
    dump:
      'activity="com.google.android.gsf.login" text="This device was reset" text="Mi account" ' +
      'text="Sign in to your Google Account"',
    expected: "google_verify",
  },
  {
    id: "oppo-copyapps",
    brand: "oppo",
    version: "Android 15 / ColorOS",
    dump: 'activity="com.oplus.setupwizard" text="Copy apps & data" text="Transfer"',
    expected: "copy_apps",
  },
  {
    id: "motorola-wifi",
    brand: "motorola",
    version: "Android 14",
    dump: 'activity="com.google.android.setupwizard" text="Wi-Fi" text="Network & internet" text="Skip"',
    expected: "wifi_setup",
  },
  {
    id: "vivo-funtouch-frp",
    brand: "vivo",
    version: "Android 15 / Funtouch OS",
    dump:
      'activity="com.vivo.setupwizard" text="This device was reset" text="Sign in to your Google Account" ' +
      'text="Forgot email?"',
    expected: "google_verify",
  },
  {
    id: "locked-cooldown",
    brand: "samsung",
    version: "Android 15 / One UI 7",
    dump:
      'activity="com.google.android.gsf.login" text="Too many attempts" text="Try again in 24 hours"',
    expected: "locked_out",
  },
  {
    id: "recovery-menu",
    brand: "other",
    version: "any",
    dump:
      'text="Android Recovery" text="Wipe data/factory reset" text="Reboot system now"',
    expected: "recovery_menu",
  },
  {
    id: "launcher-home",
    brand: "samsung",
    version: "any",
    dump: 'activity="com.sec.android.app.launcher" text="App drawer" text="Recents"',
    expected: "launcher_home",
  },
];
