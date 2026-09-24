/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AsaasSettings } from '@/components/admin/AsaasSettings';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              value: {
                environment: 'sandbox',
                apiKey: 'test_api_key_placeholder',
                webhookSecret: 'test_webhook_secret',
                municipalServiceCode: '01.07',
                issRate: 2.0,
                defaultInvoiceDescription: 'Licenciamento de software de gestão financeira SaaS e mensageria WhatsApp',
                autoEmitOnRecharge: true,
                autoEmitOnPlanSubscription: true,
              }
            },
            error: null,
          }),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('Admin Asaas Settings Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve renderizar o cabeçalho, campos de credenciais e parâmetros fiscais', async () => {
    render(<AsaasSettings />);

    expect(screen.getByText(/Integração Asaas & Emissão Fiscal/i)).toBeInTheDocument();
    expect(screen.getByText(/Ambiente Sandbox \(Testes\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Testar Conexão/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar Alterações/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Chave de API \/ Access Token/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Código de Serviço \/ CNAE/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Alíquota de ISS/i)).toBeInTheDocument();
  });

  it('deve alternar entre o ambiente Sandbox e Produção ao clicar', async () => {
    render(<AsaasSettings />);

    const prodButton = screen.getByText(/Produção \(Real\)/i);
    fireEvent.click(prodButton);

    await waitFor(() => {
      expect(screen.getByText(/Ambiente de Produção/i)).toBeInTheDocument();
    });
  });

  it('deve alternar a visibilidade da chave de API entre mascarada e texto claro', async () => {
    render(<AsaasSettings />);

    const apiKeyInput = screen.getByLabelText(/Chave de API \/ Access Token/i);
    expect(apiKeyInput).toHaveAttribute('type', 'password');

    const toggleViewBtn = screen.getByText(/Visualizar/i);
    fireEvent.click(toggleViewBtn);

    expect(apiKeyInput).toHaveAttribute('type', 'text');
    expect(screen.getByText(/Ocultar/i)).toBeInTheDocument();
  });

  it('deve executar o teste de conexão com o Asaas e exibir o card de sucesso com saldo', async () => {
    render(<AsaasSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Testar Conexão/i })).not.toBeDisabled();
    });

    const testBtn = screen.getByRole('button', { name: /Testar Conexão/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText(/Conexão com Asaas Ativa & Validada/i)).toBeInTheDocument();
      expect(screen.getByText(/Previna Tecnologia & Gestão LTDA/i)).toBeInTheDocument();
      expect(screen.getByText(/Saldo Disponível em Conta:/i)).toBeInTheDocument();
    });
  });

  it('deve salvar as configurações com sucesso no localStorage e Supabase', async () => {
    render(<AsaasSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Salvar Alterações/i })).not.toBeDisabled();
    });

    const saveBtn = screen.getByRole('button', { name: /Salvar Alterações/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(localStorage.getItem('previna_asaas_admin_config')).toBeTruthy();
    });
  });
});

