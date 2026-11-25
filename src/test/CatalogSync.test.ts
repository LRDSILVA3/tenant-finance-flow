import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCatalogSyncSettings,
  setCatalogSyncSettings,
  isDailySyncDue,
  checkAndRunDailyCatalogSync,
  CATALOG_AUTO_SYNC_KEY,
  CATALOG_LAST_SYNC_KEY,
  CATALOG_APPLY_SALE_PRICE_KEY,
} from '@/utils/catalogSyncUtils';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('CatalogSyncUtils', () => {
  const clientId = 'tenant-test-123';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getCatalogSyncSettings and setCatalogSyncSettings', () => {
    it('returns default settings when nothing is stored', () => {
      const settings = getCatalogSyncSettings(clientId);
      expect(settings.enabled).toBe(false);
      expect(settings.applySalePrice).toBe(false);
      expect(settings.lastSyncDate).toBeNull();
    });

    it('saves and retrieves enabled and applySalePrice preferences', () => {
      setCatalogSyncSettings(clientId, { enabled: true, applySalePrice: true });
      const settings = getCatalogSyncSettings(clientId);
      expect(settings.enabled).toBe(true);
      expect(settings.applySalePrice).toBe(true);
    });
  });

  describe('isDailySyncDue', () => {
    it('returns true if lastSyncDate is null or invalid', () => {
      expect(isDailySyncDue(null)).toBe(true);
      expect(isDailySyncDue('invalid-date')).toBe(true);
    });

    it('returns false if last sync was recent (< 24 hours)', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(isDailySyncDue(twoHoursAgo)).toBe(false);
    });

    it('returns true if last sync was more than 24 hours ago', () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      expect(isDailySyncDue(twentyFiveHoursAgo)).toBe(true);
    });
  });

  describe('checkAndRunDailyCatalogSync', () => {
    it('returns without syncing if disabled and force is false', async () => {
      setCatalogSyncSettings(clientId, { enabled: false });
      const res = await checkAndRunDailyCatalogSync(clientId, false);
      expect(res.synced).toBe(false);
      expect(res.updatedCount).toBe(0);
    });

    it('syncs products when forced even if disabled in storage', async () => {
      const mockCatalog = [
        {
          code: '102840',
          name: 'Summer Bag Set',
          cost_price: 240.5,
          retail_reference_price: 370,
          image_url: 'https://example.com/summer-bag.webp',
        },
      ];

      const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCatalog),
      } as any);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'prod-local-1',
                sku: '102840',
                name: 'Summer Bag Set',
                cost_price: 200, // Preço antigo desatualizado
                sale_price: 0,
                image_url: null,
              },
            ],
            error: null,
          }),
        }),
        update: mockUpdate,
      });

      const res = await checkAndRunDailyCatalogSync(clientId, true);
      expect(res.synced).toBe(true);
      expect(res.updatedCount).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          cost_price: 240.5,
          image_url: 'https://example.com/summer-bag.webp',
        })
      );

      globalFetchSpy.mockRestore();
    });

    it('updates sale_price if applySalePrice is configured to true', async () => {
      setCatalogSyncSettings(clientId, { enabled: true, applySalePrice: true });

      const mockCatalog = [
        {
          code: '102840',
          name: 'Summer Bag Set',
          cost_price: 240.5,
          retail_reference_price: 370,
          image_url: 'https://example.com/summer-bag.webp',
        },
      ];

      const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCatalog),
      } as any);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'prod-local-1',
                sku: '102840',
                name: 'Summer Bag Set',
                cost_price: 240.5,
                sale_price: 300,
                image_url: 'https://example.com/summer-bag.webp',
              },
            ],
            error: null,
          }),
        }),
        update: mockUpdate,
      });

      const res = await checkAndRunDailyCatalogSync(clientId, true);
      expect(res.synced).toBe(true);
      expect(res.updatedCount).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          sale_price: 370,
        })
      );

      globalFetchSpy.mockRestore();
    });

    it('respects 0% discount (full catalog price) as cost_price', async () => {
      setCatalogSyncSettings(clientId, { enabled: true, discountPercent: 0 });

      const mockCatalog = [
        {
          code: '102840',
          name: 'Summer Bag Set',
          cost_price: 240.5,
          retail_reference_price: 370,
          image_url: 'https://example.com/summer-bag.webp',
        },
      ];

      const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCatalog),
      } as any);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'prod-local-1',
                sku: '102840',
                name: 'Summer Bag Set',
                cost_price: 200,
                sale_price: 0,
                image_url: 'https://example.com/summer-bag.webp',
              },
            ],
            error: null,
          }),
        }),
        update: mockUpdate,
      });

      const res = await checkAndRunDailyCatalogSync(clientId, true);
      expect(res.synced).toBe(true);
      expect(res.updatedCount).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          cost_price: 370, // 0% desconto = valor cheio de revista
        })
      );

      globalFetchSpy.mockRestore();
    });

    it('recalculates cost_price based on customized discountPercent (ex: 0% sem desconto ou 40%)', async () => {
      // Configurar 0% de desconto (preço de capa cheio sem margem)
      setCatalogSyncSettings(clientId, { enabled: true, discountPercent: 0 });

      const mockCatalog = [
        {
          code: '102840',
          name: 'Summer Bag Set',
          cost_price: 240.5,
          retail_reference_price: 370,
          image_url: 'https://example.com/summer-bag.webp',
        },
      ];

      const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCatalog),
      } as any);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'prod-local-1',
                sku: '102840',
                name: 'Summer Bag Set',
                cost_price: 200,
                sale_price: 0,
                image_url: null,
              },
            ],
            error: null,
          }),
        }),
        update: mockUpdate,
      });

      const res = await checkAndRunDailyCatalogSync(clientId, true);
      expect(res.synced).toBe(true);
      expect(res.updatedCount).toBe(1);
      // Com desconto de 0%, o custo deve ser exatamente 370 (preço integral de revista)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          cost_price: 370,
        })
      );

      globalFetchSpy.mockRestore();
    });
  });
});
