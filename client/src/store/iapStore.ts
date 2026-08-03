import { create } from 'zustand';
import {
  isIAPAvailable,
  loadProducts,
  purchaseProduct,
  restorePurchases,
  getActiveSubscriptions,
  syncTransactionsToBackend,
  onTransactionUpdate,
  PRODUCT_TIER_MAP,
} from '@/services/iap';

interface IAPProduct {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: number;
  subscriptionPeriod?: { unit: 'month' | 'year'; value: number };
}

interface IAPState {
  available: boolean;
  products: IAPProduct[];
  loading: boolean;
  purchasing: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  purchase: (productId: string, userId: string, creatorId: string, tierId: string) => Promise<'success' | 'cancelled' | 'pending' | 'failed'>;
  restore: (creatorId: string) => Promise<number>;
  getProductForTier: (tierName: string, interval: 'month' | 'year') => IAPProduct | undefined;
}

export const useIAPStore = create<IAPState>((set, get) => ({
  available: false,
  products: [],
  loading: false,
  purchasing: false,
  error: null,

  initialize: async () => {
    if (!isIAPAvailable()) {
      set({ available: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const products = await loadProducts();
      set({ available: true, products, loading: false });

      // Listen for transaction updates (renewals, etc.)
      onTransactionUpdate((tx) => {
        // Transaction updated — could notify the UI
        console.log('IAP transaction update:', tx.productId);
      });
    } catch (err: any) {
      set({ loading: false, error: err.message });
    }
  },

  purchase: async (productId, userId, creatorId, tierId) => {
    set({ purchasing: true, error: null });
    try {
      const result = await purchaseProduct(productId, userId, creatorId, tierId);

      if (result.status === 'success') {
        // Sync to backend immediately
        try {
          if (result.transaction) {
            await syncTransactionsToBackend([result.transaction], creatorId);
          } else {
            // Plugin returned success without the transaction payload — pull
            // current entitlements from StoreKit and sync those instead, so
            // the purchase is never stranded waiting on the Apple webhook.
            const active = await getActiveSubscriptions();
            if (active.length > 0) {
              await syncTransactionsToBackend(active, creatorId);
            }
          }
        } catch (syncErr) {
          console.error('Failed to sync purchase to backend:', syncErr);
          // Purchase still succeeded on Apple side — backend will catch up via webhook
        }
      }

      set({ purchasing: false });
      return result.status as any;
    } catch (err: any) {
      set({ purchasing: false, error: err.message });
      return 'failed';
    }
  },

  restore: async (creatorId) => {
    set({ loading: true, error: null });
    try {
      const transactions = await restorePurchases();
      if (transactions.length > 0) {
        const result = await syncTransactionsToBackend(transactions, creatorId);
        set({ loading: false });
        return result.count;
      }
      set({ loading: false });
      return 0;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      return 0;
    }
  },

  getProductForTier: (tierName, interval) => {
    const { products } = get();
    // Walk EVERY product ID mapped to this tier + interval (bwm2 first, then
    // legacy generations) and return the first one StoreKit actually loaded —
    // taking only the first map entry bricks the tier if that one ID fails to
    // load on the device.
    for (const [productId, mapping] of Object.entries(PRODUCT_TIER_MAP)) {
      if (mapping.tier !== tierName || mapping.interval !== interval) continue;
      const product = products.find(p => p.id === productId);
      if (product) return product;
    }
    return undefined;
  },
}));
