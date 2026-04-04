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
 * Initiate a purchase.
 * @param productId - Apple product ID (e.g. 'vip_monthly')
 * @param userId - User ID for backend linking
 * @param creatorId - Creator ID for backend linking
 * @returns Purchase result with status and transaction data
 */
export async function purchaseProduct(
  productId: string,
  userId: string,
  creatorId: string,
): Promise<{ status: string; transaction?: StoreKitTransaction }> {
  if (!StoreKit) {
    throw new Error('In-App Purchases not available on this platform');
  }

  // Generate a deterministic UUID from userId:creatorId for appAccountToken
  // This links the Apple transaction to our backend user+creator
  const tokenStr = generateUUIDFromString(`${userId}:${creatorId}`);

  const result = await StoreKit.purchase({
    productId,
    appAccountToken: tokenStr,
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

  // For consumables, appAccountToken carries just the userId
  const tokenStr = generateUUIDFromString(userId);

  const result = await StoreKit.purchase({
    productId,
    appAccountToken: tokenStr,
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
        // StoreKit 2 verifies transactions on-device before returning them.
        // Backend accepts JSON-serialized transaction objects from native apps
        // and falls back to JWS verification for server-to-server notifications.
        signedTransaction: JSON.stringify(tx),
        creatorId,
      })),
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Sync failed');
  return { count: data.count || 0 };
}

/**
 * Generate a deterministic UUID v5-like string from an input.
 * Used to create appAccountToken from userId:creatorId.
 */
function generateUUIDFromString(input: string): string {
  // Simple hash-based UUID generation (not crypto-secure, but deterministic)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  // Format as UUID
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(0, 3)}-${hex.padEnd(12, '0').slice(0, 12)}`;
}
