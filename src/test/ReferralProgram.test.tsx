import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  generateReferralCode,
  cleanReferralCode,
  getStoredReferralCode,
  setStoredReferralCode,
  clearStoredReferralCode,
  getReferralLink,
  getReferralWhatsAppMessage,
  getWhatsAppShareUrl,
  calculateTrialDays,
  EXTENDED_REFERRAL_TRIAL_DAYS,
  STANDARD_TRIAL_DAYS,
} from '@/utils/referralUtils';
import { ReferralProgramDialog } from '@/components/referrals/ReferralProgramDialog';

// Mock useFinance state
const mockCurrentClient = {
  id: 'client-123',
  name: 'Oficina do Silva',
  taxId: '12.345.678/0001-90',
  userId: 'user-123',
  createdAt: new Date(),
  referralCode: 'K7M29B',
};

vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: () => ({
    currentClient: mockCurrentClient,
  }),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({
            data: [
              {
                id: 'ref-1',
                referral_code: 'K7M29B',
                referred_company_name: 'Auto Peças Modelo',
                referred_email: 'contato@modelo.com',
                status: 'trialing',
                reward_months_awarded: 0,
                created_at: '2026-11-20T10:00:00.000Z',
              },
              {
                id: 'ref-2',
                referral_code: 'K7M29B',
                referred_company_name: 'Mercado Central',
                referred_email: 'admin@central.com',
                status: 'rewarded',
                reward_months_awarded: 1,
                created_at: '2026-11-15T14:30:00.000Z',
              },
            ],
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}));

describe('Referral Program Utilities (referralUtils.ts)', () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
    };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true, writable: true });
    clearStoredReferralCode();
  });

  it('generateReferralCode deve gerar código de 6 caracteres alfanuméricos limpo sem prefixo', () => {
    const code = generateReferralCode();
    expect(code).toBeTruthy();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[2-9A-Z]{6}$/);
    expect(code.includes('-')).toBe(false);
  });

  it('generateReferralCode deve aceitar parâmetro de comprimento customizado', () => {
    const code = generateReferralCode(8);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[2-9A-Z]{8}$/);
  });

  it('cleanReferralCode deve normalizar o código, remover caracteres inválidos e extrair apenas o código se houver prefixo', () => {
    expect(cleanReferralCode('  k7m29b  ')).toBe('K7M29B');
    expect(cleanReferralCode('MERCADO-X9K2')).toBe('X9K2'); // remove prefixo de formatos legados
    expect(cleanReferralCode('abc')).toBeNull(); // menos de 4 chars
    expect(cleanReferralCode(null)).toBeNull();
    expect(cleanReferralCode(undefined)).toBeNull();
  });

  it('setStoredReferralCode e getStoredReferralCode devem persistir no localStorage', () => {
    expect(getStoredReferralCode()).toBeNull();
    setStoredReferralCode('K7M29B');
    expect(getStoredReferralCode()).toBe('K7M29B');
    clearStoredReferralCode();
    expect(getStoredReferralCode()).toBeNull();
  });

  it('getReferralLink deve retornar a URL com o parâmetro ?ref=', () => {
    const link = getReferralLink('MEUCODIGO');
    expect(link).toContain('/onboarding?ref=MEUCODIGO');
  });

  it('getReferralWhatsAppMessage e getWhatsAppShareUrl devem conter mensagem persuasiva e link', () => {
    const msg = getReferralWhatsAppMessage('MEUCODIGO', 'Padaria Central');
    expect(msg).toContain('22 dias de acesso liberado');
    expect(msg).toContain('/onboarding?ref=MEUCODIGO');
    expect(msg).toContain('Padaria Central');

    const shareUrl = getWhatsAppShareUrl('MEUCODIGO', 'Padaria Central');
    expect(shareUrl.startsWith('https://api.whatsapp.com/send?text=')).toBe(true);
  });

  it('calculateTrialDays deve retornar 22 dias se houver indicação e 7 dias como padrão', () => {
    expect(calculateTrialDays(true, STANDARD_TRIAL_DAYS)).toBe(EXTENDED_REFERRAL_TRIAL_DAYS);
    expect(calculateTrialDays(false, STANDARD_TRIAL_DAYS)).toBe(STANDARD_TRIAL_DAYS);
    expect(calculateTrialDays(true, 0)).toBe(0); // se plano não tem trial, mantém 0
  });
});

describe('ReferralProgramDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o diálogo com o código e link da empresa', async () => {
    const mockOpenChange = vi.fn();

    render(
      <ReferralProgramDialog
        open={true}
        onOpenChange={mockOpenChange}
      />
    );

    expect(screen.getByText('Indique e Ganhe Meses Grátis')).toBeInTheDocument();
    expect(screen.getByText('K7M29B')).toBeInTheDocument();
    expect(screen.getByText('Copiar')).toBeInTheDocument();
    expect(screen.getByText('Compartilhar no WhatsApp')).toBeInTheDocument();

    // Deve carregar as métricas dos amigos indicados
    await waitFor(() => {
      expect(screen.getByText('Auto Peças Modelo')).toBeInTheDocument();
      expect(screen.getByText('Mercado Central')).toBeInTheDocument();
      expect(screen.getByText('Em Teste (22 dias)')).toBeInTheDocument();
      expect(screen.getByText('Mês Grátis Concedido')).toBeInTheDocument();
    });
  });

  it('deve copiar o link para a área de transferência ao clicar em copiar', async () => {
    const mockOpenChange = vi.fn();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ReferralProgramDialog
        open={true}
        onOpenChange={mockOpenChange}
      />
    );

    const copyBtn = screen.getByText('Copiar');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
  });
});
