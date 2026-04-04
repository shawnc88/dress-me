import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities.
 * Detects whether the app is running in a native iOS/Android container
 * or in a regular web browser.
 */

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}

/**
 * Returns true if Apple In-App Purchase should be used instead of Stripe.
 * Apple requires IAP for digital subscriptions in native iOS apps.
 */
export function shouldUseAppleIAP(): boolean {
  return isIOS();
}
