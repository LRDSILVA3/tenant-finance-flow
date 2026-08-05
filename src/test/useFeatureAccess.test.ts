import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useFinance } from '@/contexts/FinanceContext';

vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

describe('useFeatureAccess Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve liberar todos os acessos se o usuário for Administrador', () => {
    vi.mocked(useFinance).mockReturnValue({
      userProfile: { isAdmin: true },
      currentSubscription: null,
      currentPlan: null,
    } as any);

    const { result } = renderHook(() => useFeatureAccess());

    expect(result.current.isSubscriptionActive).toBe(true);
    expect(result.current.hasFeature('commissions' as any)).toBe(true);
  });

  it('deve retornar falso se não houver assinatura', () => {
    vi.mocked(useFinance).mockReturnValue({
      userProfile: { isAdmin: false },
      currentSubscription: null,
      currentPlan: null,
    } as any);

    const { result } = renderHook(() => useFeatureAccess());

    expect(result.current.isSubscriptionActive).toBe(false);
    expect(result.current.hasFeature('commissions' as any)).toBe(false);
  });

  it('deve retornar ativo se a assinatura estiver ativa e no período válido', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 dias no futuro
    
    vi.mocked(useFinance).mockReturnValue({
      userProfile: { isAdmin: false },
      currentSubscription: {
        status: 'active',
        currentPeriodEnd: futureDate,
      },
      currentPlan: {
        name: 'Premium',
        features: {
          commissions: true,
          inventory: false,
        },
      },
    } as any);

    const { result } = renderHook(() => useFeatureAccess());

    expect(result.current.isSubscriptionActive).toBe(true);
    expect(result.current.hasFeature('commissions' as any)).toBe(true);
    expect(result.current.hasFeature('inventory' as any)).toBe(false);
    expect(result.current.planName).toBe('Premium');
  });

  it('deve reter assinatura inativa se o período ativo expirou no passado', () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 dias no passado

    vi.mocked(useFinance).mockReturnValue({
      userProfile: { isAdmin: false },
      currentSubscription: {
        status: 'active',
        currentPeriodEnd: pastDate,
      },
      currentPlan: {
        name: 'Premium',
        features: { commissions: true },
      },
    } as any);

    const { result } = renderHook(() => useFeatureAccess());

    expect(result.current.isSubscriptionActive).toBe(false);
    expect(result.current.hasFeature('commissions' as any)).toBe(false);
  });

  it('deve conceder acesso se a assinatura estiver em trial e a data trial for futura', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(useFinance).mockReturnValue({
      userProfile: { isAdmin: false },
      currentSubscription: {
        status: 'trialing',
        trialEnd: futureDate,
      },
      currentPlan: {
        name: 'Básico',
        features: { inventory: true },
      },
    } as any);

    const { result } = renderHook(() => useFeatureAccess());

    expect(result.current.isSubscriptionActive).toBe(true);
    expect(result.current.hasFeature('inventory' as any)).toBe(true);
  });

  it('deve bloquear acesso se o trial expirou', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(useFinance).mockReturnValue({
      userProfile: { isAdmin: false },
      currentSubscription: {
        status: 'trialing',
        trialEnd: pastDate,
      },
      currentPlan: {
        name: 'Básico',
        features: { inventory: true },
      },
    } as any);

    const { result } = renderHook(() => useFeatureAccess());

    expect(result.current.isSubscriptionActive).toBe(false);
  });

  it('deve conceder acesso à assinatura cancelada se ainda estiver dentro do período pago', () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(useFinance).mockReturnValue({
      userProfile: { isAdmin: false },
      currentSubscription: {
        status: 'canceled',
        currentPeriodEnd: futureDate,
        trialEnd: null,
      },
      currentPlan: {
        name: 'Pro',
        features: { commissions: true },
      },
    } as any);

    const { result } = renderHook(() => useFeatureAccess());

    expect(result.current.isSubscriptionActive).toBe(true);
    expect(result.current.hasFeature('commissions' as any)).toBe(true);
  });
});
