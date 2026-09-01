import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Customers } from '@/components/customers/Customers';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Mock useFinance
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock supabase queries
const mockSelect = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'customers') {
        return {
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ data: [], error: null }) }),
      } as any;
    }),
  },
}));

describe('Customers CRM Component', () => {
  const mockReloadContextCustomers = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useFinance).mockReturnValue({
      currentClient: { id: 'client-123', name: 'Empresa Teste' },
      loadCustomers: mockReloadContextCustomers,
    } as any);

    // Configuração padrão do Select
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'cust-10',
              client_id: 'client-123',
              name: 'Ana Souza',
              phone: '(11) 98888-8888',
              email: 'ana@souza.com',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 'cust-20',
              client_id: 'client-123',
              name: 'Bruno Lima',
              phone: '',
              email: 'bruno@lima.com',
              is_active: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ],
          error: null
        })
      })
    });
  });

  it('deve carregar e renderizar a listagem de clientes', async () => {
    render(<Customers />);

    await waitFor(() => {
      expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0);
    });

    // Como o filtro padrão é "Ativos", 'Bruno Lima' que é inativo não deve estar na tela inicialmente
    expect(screen.queryByText('Bruno Lima')).toBeNull();
  });

  it('deve permitir filtrar clientes por busca textual', async () => {
    render(<Customers />);

    await waitFor(() => {
      expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText('Buscar por nome, email...');
    
    // Buscar por um nome inexistente
    fireEvent.change(searchInput, { target: { value: 'Inexistente' } });
    expect(screen.queryByText('Ana Souza')).toBeNull();

    // Limpar busca
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0);
  });

  it('deve exibir erros de validação no formulário ao tentar cadastrar cliente vazio', async () => {
    render(<Customers />);

    await waitFor(() => {
      expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0);
    });

    const addBtn = screen.getByRole('button', { name: /Novo Cliente/i });
    fireEvent.click(addBtn);

    // Clicar em Salvar sem preencher nada
    const saveBtn = screen.getByRole('button', { name: /Salvar/i });
    fireEvent.click(saveBtn);

    // Deve acusar erro no nome
    expect(screen.getByText('Nome é obrigatório.')).toBeInTheDocument();
  });

  it('deve cadastrar um novo cliente com sucesso e recarregar os dados', async () => {
    render(<Customers />);

    await waitFor(() => {
      expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0);
    });

    const addBtn = screen.getByRole('button', { name: /Novo Cliente/i });
    fireEvent.click(addBtn);

    // Preencher formulário
    fireEvent.change(screen.getByLabelText(/Nome \*/i), { target: { value: 'Carlos Magno' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'carlos@magno.com' } });
    fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), { target: { value: '(11) 97777-7777' } });

    // Salvar
    const saveBtn = screen.getByRole('button', { name: /Salvar/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Carlos Magno',
        email: 'carlos@magno.com',
        phone: '(11) 97777-7777'
      }));
      // Deve sincronizar com o contexto global de finanças
      expect(mockReloadContextCustomers).toHaveBeenCalledWith('client-123');
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Cliente cadastrado com sucesso!'
      }));
    });
  });
});
