import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * StoreKit 2 bridge for Apple In-App Purchases.
 * Only works when running inside the native iOS Capacitor shell.
 * On web, all methods return graceful fallbacks.
 */

// Type definitions for the native plugin
interface StoreKitProduct {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: number;
  type: string;
  subscriptionPeriod?: { unit: 'month' | 'year'; value: number };
}

interface StoreKitTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  appAccountToken?: string;
  isUpgraded?: boolean;
  revocationDate?: number;
  /** Bundle ID of the app that owns this transaction — required for server verification. */
  bundleId?: string;
  /**
   * The raw JWS (signedTransactionInfo) from StoreKit 2. Present on modern
   * Capacitor StoreKit plugins. When absent, the backend accepts the parsed
   * transaction object instead (see /api/fan-subscriptions/restore).
   */
  signedTransactionInfo?: string;
}

interface StoreKitPluginInterface {
  getProducts(options: { productIds: string[] }): Promise<{ products: StoreKitProduct[] }>;
  purchase(options: { productId: string; appAccountToken?: string }): Promise<{
    status: 'success' | 'cancelled' | 'pending' | 'unknown';
    transaction?: StoreKitTransaction;
  }>;
  restorePurchases(): Promise<{ transactions: StoreKitTransaction[]; count: number }>;
  getActiveSubscriptions(): Promise<{ subscriptions: StoreKitTransaction[] }>;
  addListener(event: 'transactionUpdate', callback: (data: StoreKitTransaction) => void): Promise<any>;
}

// Register the native plugin — only available on iOS
const StoreKit = Capacitor.getPlatform() === 'ios'
  ? registerPlugin<StoreKitPluginInterface>('StoreKit')
  : null;

// All 6 subscription product IDs
export const SUBSCRIPTION_PRODUCT_IDS = [
  'supporter_monthly',
  'vip_monthly',
  'inner_circle_monthly',
  'supporter_yearly',
  'vip_yearly',
  'inner_circle_yearly',
] as const;

// Consumable thread/coin product IDs (must match App Store Connect)
// Consumable thread/coin product IDs (must match App Store Connect + backend)
export const THREAD_PRODUCT_IDS = [
  'threads_500',
  'threads_1050',
  'threads_5500',
  'threads_11500',
] as const;

// Map Apple consumable product IDs to coin counts (must match backend APPLE_THREAD_PRODUCTS)
export const THREAD_PRODUCT_MAP: Record<string, number> = {
  threads_500: 500,
  threads_1050: 1200,
  threads_5500: 3500,
  threads_11500: 8000,
};

// Combined product IDs for loading
export const PRODUCT_IDS = [
  ...SUBSCRIPTION_PRODUCT_IDS,
  ...THREAD_PRODUCT_IDS,
] as const;

// Map product IDs to tier names and billing intervals
export const PRODUCT_TIER_MAP: Record<string, { tier: string; interval: 'month' | 'year' }> = {
  supporter_monthly: { tier: 'SUPPORTER', interval: 'month' },
  supporter_yearly: { tier: 'SUPPORTER', interval: 'year' },
  vip_monthly: { tier: 'VIP', interval: 'month' },
  vip_yearly: { tier: 'VIP', interval: 'year' },
  inner_circle_monthly: { tier: 'INNER_CIRCLE', interval: 'month' },
  inner_circle_yearly: { tier: 'INNER_CIRCLE', interval: 'year' },
};

/**
 * Check if Apple IAP is available (running on native iOS).
 */
export function isIAPAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios' && StoreKit !== null;
}

/**
 * Load subscription products from Apple.
 */
export async function loadProducts(): Promise<StoreKitProduct[]> {
  if (!StoreKit) return [];
  try {
    const result = await StoreKit.getProducts({ productIds: [...PRODUCT_IDS] });
    return result.products || [];
  } catch (err) {
    console.error('Failed to load IAP products:', err);
    return [];
  }
}

/**
 * Initiate a creator-subscription IAP purchase.
 *
 * Flow:
 *   1. Generate a proper random UUID for `appAccountToken`.
 *   2. POST /api/fan-subscriptions/prepare-iap so the server persists
 *      (appAccountToken → userId, creatorId, tierId) before StoreKit fires.
 *   3. Call StoreKit.purchase with the same token.
 *   4. When Apple's webhook arrives, the server looks up the mapping and
 *      activates the FanSubscription.
 *
 * Earlier versions packed `userId:creatorId` into the token and tried to
 * split() it out on the server. That didn't work (tokens must be UUIDs)
 * and silently dropped every Apple subscription webhook.
 */
export async function purchaseProduct(
  productId: string,
  _userId: string,
  creatorId: string,
  tierId: string,
): Promise<{ status: string; transaction?: StoreKitTransaction }> {
  if (!StoreKit) {
    throw new Error('In-App Purchases not available on this platform');
  }

  const appAccountToken = generateRandomUUID();

  // Register the intent server-side so the webhook can resolve user+creator
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) throw new Error('Not authenticated');
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const prepRes = await fetch(`${API_URL}/api/fan-subscriptions/prepare-iap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ appAccountToken, creatorId, tierId }),
  });
  if (!prepRes.ok) {
    const msg = await prepRes.json().catch(() => ({}));
    throw new Error(msg?.error?.message || 'Failed to prepare IAP purchase');
  }

  const result = await StoreKit.purchase({
    productId,
    appAccountToken,
  });

  return result;
}


/**
 * Purchase threads (consumable IAP).
 * @param productId - Apple product ID (e.g. 'threads_500')
 * @param userId - User ID for backend crediting
 * @returns Purchase result
 */
export async function purchaseThreads(
  productId: string,
  userId: string,
): Promise<{ status: string; transaction?: StoreKitTransaction }> {
  if (!StoreKit) {
    throw new Error('In-App Purchases not available on this platform');
  }

  // Consumable (thread pack) purchases: server uses the authenticated JWT to
  // identify the user, not the appAccountToken. Send a random UUID so Apple
  // still receives a well-formed token but no mapping lookup is required.
  void userId; // retained in signature for API symmetry with purchaseProduct
  const result = await StoreKit.purchase({
    productId,
    appAccountToken: generateRandomUUID(),
  });

  return result;
}

/**
 * Sync a consumable thread purchase to the backend.
 * Credits threads to the user's account.
 */
export async function syncThreadPurchaseToBackend(
  transaction: StoreKitTransaction,
): Promise<{ balance: number }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) throw new Error('Not authenticated');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const threads = THREAD_PRODUCT_MAP[transaction.productId];
  if (!threads) throw new Error(`Unknown thread product: ${transaction.productId}`);

  const res = await fetch(`${API_URL}/api/threads/apple-iap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      transactionId: transaction.transactionId,
      originalTransactionId: transaction.originalTransactionId,
      productId: transaction.productId,
      threads,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to credit threads');
  return { balance: data.balance };
}

/**
 * Restore all previous purchases.
 * Returns verified transactions that can be sent to backend.
 */
export async function restorePurchases(): Promise<StoreKitTransaction[]> {
  if (!StoreKit) return [];
  const result = await StoreKit.restorePurchases();
  return result.transactions || [];
}

/**
 * Get currently active subscriptions.
 */
export async function getActiveSubscriptions(): Promise<StoreKitTransaction[]> {
  if (!StoreKit) return [];
  const result = await StoreKit.getActiveSubscriptions();
  return result.subscriptions || [];
}

/**
 * Listen for transaction updates (renewals, cancellations, etc.).
 */
export function onTransactionUpdate(callback: (tx: StoreKitTransaction) => void): void {
  if (!StoreKit) return;
  StoreKit.addListener('transactionUpdate', callback);
}

/**
 * Sync restored/purchased transactions to our backend.
 */
export async function syncTransactionsToBackend(
  transactions: StoreKitTransaction[],
  creatorId: string,
): Promise<{ count: number }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) throw new Error('Not authenticated');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const res = await fetch(`${API_URL}/api/fan-subscriptions/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      signedTransactions: transactions.map(tx => ({
        // Prefer the raw JWS when the StoreKit plugin exposes it (lets server
        // do full cert-chain verification). Fall back to the parsed tx object
        // which the server trusts because it came from an authenticated iOS
        // client after StoreKit 2's on-device verification.
        signedTransaction: tx.signedTransactionInfo ?? tx,
        creatorId,
      })),
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Sync failed');
  return { count: data.count || 0 };
}

/**
 * Generate a proper random UUID v4 for Apple's `appAccountToken`.
 *
 * Apple requires a UUID here. Earlier versions hashed `userId:creatorId`
 * into a UUID-shaped string, which was (a) not a spec-valid UUID and
 * (b) guaranteed to collide. We now generate a random UUID and persist
 * the (token → userId, creatorId) mapping server-side via `/prepare-iap`.
 */
function generateRandomUUID(): string {
  // crypto.randomUUID() is available in all modern browsers + iOS WebKit
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older runtimes — still spec-valid UUID v4
  const bytes = new Uint8Array(16);
  (typeof crypto !== 'undefined' ? crypto : { getRandomValues: (b: Uint8Array) => {
    for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    return b;
  } }).getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

