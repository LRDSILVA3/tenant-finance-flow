/**
 * Utilitários para Sincronização Diária Automática de Catálogos de Marcas (Farmasi, etc.)
 * Permite atualizar custos, preços sugeridos e fotos dos produtos cadastrados 1x ao dia.
 */

import { supabase } from '@/integrations/supabase/client';

export const CATALOG_AUTO_SYNC_KEY = 'tf_catalog_auto_sync_';
export const CATALOG_LAST_SYNC_KEY = 'tf_catalog_last_sync_';
export const CATALOG_APPLY_SALE_PRICE_KEY = 'tf_catalog_sync_sale_price_';
export const CATALOG_DISCOUNT_PERCENT_KEY = 'tf_catalog_discount_percent_';

export interface CatalogSyncSettings {
  enabled: boolean;
  applySalePrice: boolean;
  discountPercent: number;
  lastSyncDate: string | null;
}

/**
 * Obtém as configurações de sincronização automática do cliente/tenant.
 */
export function getCatalogSyncSettings(clientId: string): CatalogSyncSettings {
  try {
    if (typeof window === 'undefined' || !clientId) {
      return { enabled: false, applySalePrice: false, discountPercent: 35, lastSyncDate: null };
    }
    const enabled = localStorage.getItem(`${CATALOG_AUTO_SYNC_KEY}${clientId}`) === 'true';
    const applySalePrice = localStorage.getItem(`${CATALOG_APPLY_SALE_PRICE_KEY}${clientId}`) === 'true';
    const rawDiscount = localStorage.getItem(`${CATALOG_DISCOUNT_PERCENT_KEY}${clientId}`);
    const discountPercent = rawDiscount !== null && !isNaN(Number(rawDiscount)) ? Number(rawDiscount) : 35;
    const lastSyncDate = localStorage.getItem(`${CATALOG_LAST_SYNC_KEY}${clientId}`);
    return { enabled, applySalePrice, discountPercent, lastSyncDate };
  } catch {
    return { enabled: false, applySalePrice: false, discountPercent: 35, lastSyncDate: null };
  }
}

/**
 * Salva as configurações de sincronização automática para o cliente/tenant.
 */
export function setCatalogSyncSettings(
  clientId: string,
  settings: { enabled: boolean; applySalePrice?: boolean; discountPercent?: number }
): void {
  try {
    if (typeof window === 'undefined' || !clientId) return;
    localStorage.setItem(`${CATALOG_AUTO_SYNC_KEY}${clientId}`, settings.enabled ? 'true' : 'false');
    if (settings.applySalePrice !== undefined) {
      localStorage.setItem(`${CATALOG_APPLY_SALE_PRICE_KEY}${clientId}`, settings.applySalePrice ? 'true' : 'false');
    }
    if (settings.discountPercent !== undefined) {
      localStorage.setItem(`${CATALOG_DISCOUNT_PERCENT_KEY}${clientId}`, String(settings.discountPercent));
    }
  } catch (err) {
    console.warn('Erro ao salvar configurações de sincronização do catálogo:', err);
  }
}

/**
 * Verifica se a sincronização já rodou nas últimas 24 horas.
 */
export function isDailySyncDue(lastSyncDate: string | null): boolean {
  if (!lastSyncDate) return true;
  const last = new Date(lastSyncDate);
  if (isNaN(last.getTime())) return true;
  
  const now = new Date();
  const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  return diffHours >= 24;
}

/**
 * Executa a sincronização diária de produtos do catálogo Farmasi cadastrados no estoque do cliente.
 */
export async function checkAndRunDailyCatalogSync(
  clientId: string,
  force = false
): Promise<{ synced: boolean; updatedCount: number }> {
  try {
    if (!clientId) return { synced: false, updatedCount: 0 };
    
    const settings = getCatalogSyncSettings(clientId);
    if (!settings.enabled && !force) {
      return { synced: false, updatedCount: 0 };
    }

    if (!force && !isDailySyncDue(settings.lastSyncDate)) {
      return { synced: false, updatedCount: 0 };
    }

    // 1. Carregar bases oficiais mais recentes (Farmasi, Natura, Avon, Eudora, WePink)
    const catalogFiles = [
      '/templates/catalogo_farmasi_modelo.json',
      '/templates/catalogo_natura_modelo.json',
      '/templates/catalogo_avon_modelo.json',
      '/templates/catalogo_eudora_modelo.json',
      '/templates/catalogo_wepink_modelo.json',
    ];

    type CatalogItem = {
      code: string;
      name: string;
      cost_price: number;
      retail_reference_price?: number;
      image_url?: string;
    };

    const catalogMap = new Map<string, CatalogItem>();

    await Promise.all(
      catalogFiles.map(async (file) => {
        try {
          const res = await fetch(file);
          if (res.ok) {
            const items: CatalogItem[] = await res.json();
            if (Array.isArray(items)) {
              items.forEach((item) => {
                if (item.code) {
                  catalogMap.set(String(item.code).trim().toUpperCase(), item);
                }
              });
            }
          }
        } catch {
          // Ignora falha em arquivo individual
        }
      })
    );

    if (catalogMap.size === 0) {
      return { synced: false, updatedCount: 0 };
    }

    // 2. Buscar produtos do cliente atual
    const { data: clientProducts, error } = await supabase
      .from('products')
      .select('id, sku, name, cost_price, sale_price, image_url')
      .eq('client_id', clientId);

    if (error || !clientProducts || clientProducts.length === 0) {
      // Gravar data de checagem para não re-executar no mesmo dia
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${CATALOG_LAST_SYNC_KEY}${clientId}`, new Date().toISOString());
      }
      return { synced: true, updatedCount: 0 };
    }

    // 3. Cruzar produtos existentes pelo código SKU
    let updatedCount = 0;
    for (const prod of clientProducts) {
      if (!prod.sku) continue;
      const cleanSku = String(prod.sku).trim().toUpperCase();
      const matched = catalogMap.get(cleanSku);

      if (matched) {
        const updatePayload: Record<string, unknown> = {};

        // Atualizar preço de custo (respeitando percentual de desconto de consultora se houver preço sugerido)
        let effectiveCost = matched.cost_price;
        if (matched.retail_reference_price && matched.retail_reference_price > 0 && typeof settings.discountPercent === 'number') {
          effectiveCost = settings.discountPercent === 0
            ? matched.retail_reference_price
            : Math.round(matched.retail_reference_price * (1 - settings.discountPercent / 100) * 100) / 100;
        }

        if (effectiveCost > 0 && prod.cost_price !== effectiveCost) {
          updatePayload.cost_price = effectiveCost;
        }

        // Atualizar foto se produto não tiver imagem
        if (!prod.image_url && matched.image_url) {
          updatePayload.image_url = matched.image_url;
        }

        // Atualizar preço de venda se cliente optou por aplicar preço sugerido
        if (settings.applySalePrice && matched.retail_reference_price && matched.retail_reference_price > 0) {
          if (prod.sale_price !== matched.retail_reference_price) {
            updatePayload.sale_price = matched.retail_reference_price;
          }
        }

        if (Object.keys(updatePayload).length > 0) {
          const { error: updErr } = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', prod.id);

          if (!updErr) updatedCount++;
        }
      }
    }

    // 4. Salvar data da última sincronização com sucesso
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${CATALOG_LAST_SYNC_KEY}${clientId}`, new Date().toISOString());
    }

    return { synced: true, updatedCount };
  } catch (err) {
    console.warn('Erro ao executar sincronização diária de catálogo:', err);
    return { synced: false, updatedCount: 0 };
  }
}
