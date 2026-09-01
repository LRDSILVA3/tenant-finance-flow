import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Suppliers } from '@/components/suppliers/Suppliers';
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
const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'suppliers') {
        return {
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ data: [], error: null }) }),
      } as any;
    }),
  },
}));

describe('Suppliers CRM Component', () => {
  const mockReloadContextSuppliers = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      currentClient: { id: 'client-123', name: 'Empresa Teste' },
      loadSuppliers: mockReloadContextSuppliers,
    } as any);

    // Default return values for Supabase select
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'supp-10',
              client_id: 'client-123',
              name: 'Distribuidora Alpha',
              contact_info: 'Telefone: (11) 98888-8888',
            },
            {
              id: 'supp-20',
              client_id: 'client-123',
              name: 'Fornecedor XYZ',
              contact_info: 'Email: contato@xyz.com',
            },
          ],
          error: null,
        }),
      }),
    });
  });

  it('deve carregar e renderizar a listagem de fornecedores', async () => {
    render(<Suppliers />);

    await waitFor(() => {
      expect(screen.getByText('Distribuidora Alpha')).toBeInTheDocument();
      expect(screen.getByText('Fornecedor XYZ')).toBeInTheDocument();
    });
  });

  it('deve permitir filtrar fornecedores por busca textual', async () => {
    render(<Suppliers />);

    await waitFor(() => {
      expect(screen.getByText('Distribuidora Alpha')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar fornecedor por nome ou contato...');

    // Buscar por um nome inexistente
    fireEvent.change(searchInput, { target: { value: 'Inexistente' } });
    expect(screen.queryByText('Distribuidora Alpha')).toBeNull();

    // Limpar busca
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Distribuidora Alpha')).toBeInTheDocument();
  });

  it('deve exibir erros de validação no formulário ao tentar cadastrar fornecedor sem nome', async () => {
    render(<Suppliers />);

    await waitFor(() => {
      expect(screen.getByText('Distribuidora Alpha')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /Novo Fornecedor/i });
    fireEvent.click(addBtn);

    // Clicar em Salvar sem preencher nada
    const saveBtn = screen.getByRole('button', { name: 'Salvar Fornecedor' });
    fireEvent.click(saveBtn);

    expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
  });

  it('deve cadastrar um novo fornecedor com sucesso e recarregar os dados', async () => {
    render(<Suppliers />);

    await waitFor(() => {
      expect(screen.getByText('Distribuidora Alpha')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /Novo Fornecedor/i });
    fireEvent.click(addBtn);

    // Preencher formulário
    fireEvent.change(screen.getByLabelText(/Nome do Fornecedor/i), { target: { value: 'Fornecedora Premium' } });
    fireEvent.change(screen.getByLabelText(/Informações de Contato/i), { target: { value: '(11) 97777-7777' } });

    // Salvar
    const saveBtn = screen.getByRole('button', { name: 'Salvar Fornecedor' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'client-123',
          name: 'Fornecedora Premium',
          contact_info: '(11) 97777-7777',
        })
      );
      // Deve sincronizar com o contexto global de finanças
      expect(mockReloadContextSuppliers).toHaveBeenCalledWith('client-123');
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fornecedor cadastrado com sucesso!',
        })
      );
    });
  });

  it('deve editar um fornecedor com sucesso', async () => {
    render(<Suppliers />);

    await waitFor(() => {
      expect(screen.getByText('Distribuidora Alpha')).toBeInTheDocument();
    });

    // Encontrar botão de editar para o primeiro fornecedor
    const editBtns = screen.getAllByRole('button').filter(el => el.querySelector('svg.lucide-pencil'));
    fireEvent.click(editBtns[0]); // Editar 'Distribuidora Alpha'

    // Alterar o nome
    const nameInput = screen.getByLabelText(/Nome do Fornecedor/i);
    fireEvent.change(nameInput, { target: { value: 'Distribuidora Alpha Modificada' } });

    // Salvar
    const saveBtn = screen.getByRole('button', { name: 'Salvar Fornecedor' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockReloadContextSuppliers).toHaveBeenCalledWith('client-123');
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fornecedor atualizado com sucesso!',
        })
      );
    });
  });
});
