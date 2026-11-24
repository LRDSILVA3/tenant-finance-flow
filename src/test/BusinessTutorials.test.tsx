import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BusinessTutorialDialog } from '@/components/tutorials/BusinessTutorialDialog';
import { BUSINESS_SEGMENT_GUIDES } from '@/utils/businessTutorialsData';
import { BusinessSegment } from '@/types/finance';

// Mock useFinance state
let mockBusinessSegment: BusinessSegment = 'repair';

vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: () => ({
    businessSegment: mockBusinessSegment,
  }),
}));

describe('BusinessTutorialDialog Component & Tutorials Base', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve conter as bases de conhecimento configuradas para todos os 6 segmentos', () => {
    const segments: BusinessSegment[] = ['repair', 'retail', 'services', 'food', 'b2b', 'full'];
    
    segments.forEach((seg) => {
      const guide = BUSINESS_SEGMENT_GUIDES[seg];
      expect(guide).toBeDefined();
      expect(guide.title).toBeTruthy();
      expect(guide.dailyWorkflow.length).toBeGreaterThan(0);
      expect(guide.visibleModules.length).toBeGreaterThan(0);
      expect(guide.faq.length).toBeGreaterThan(0);
    });
  });

  it('deve renderizar o diálogo de tutoriais adaptado para Oficina Mecânica (repair)', () => {
    mockBusinessSegment = 'repair';
    const mockOpenChange = vi.fn();

    render(
      <BusinessTutorialDialog
        open={true}
        onOpenChange={mockOpenChange}
      />
    );

    expect(screen.getByText('Central de Tutoriais & Guias de Uso')).toBeInTheDocument();
    expect(screen.getByText('🔧 Módulo Automotivo')).toBeInTheDocument();
    expect(screen.getByText('Oficina Mecânica & Auto Center')).toBeInTheDocument();

    // Deve exibir o passo a passo diário da oficina
    expect(screen.getByText('1. Recepção do Veículo & Nova OS')).toBeInTheDocument();
    expect(screen.getByText(/Preencha sempre a placa correta/i)).toBeInTheDocument();

    // Alternar para aba de Módulos Ativos & Ocultos
    const modulesBtn = screen.getByRole('button', { name: /Módulos Ativos & Ocultos/i });
    fireEvent.click(modulesBtn);

    expect(screen.getByText(/Módulos Habilitados para Oficina Mecânica/i)).toBeInTheDocument();
    expect(screen.getByText('Ordens de Serviço (OS)')).toBeInTheDocument();
    expect(screen.getByText('Estoque de Peças')).toBeInTheDocument();
    expect(screen.getByText('Grade de Horários / Agenda')).toBeInTheDocument(); // listado em ocultos

    // Alternar para aba de Dúvidas Frequentes
    const faqBtn = screen.getByRole('button', { name: /Dúvidas Frequentes/i });
    fireEvent.click(faqBtn);

    expect(screen.getByText(/Como busco o histórico de um veículo que já veio na oficina\?/i)).toBeInTheDocument();
  });

  it('deve permitir trocar o perfil diretamente no seletor do tutorial para consultar outros segmentos', () => {
    mockBusinessSegment = 'repair';

    render(
      <BusinessTutorialDialog
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'retail' } });

    // Agora deve exibir tutoriais de Loja de Roupas & Varejo
    expect(screen.getByText('Loja de Roupas & Varejo')).toBeInTheDocument();
    expect(screen.getByText('1. Cadastro de Roupas com Grade & Cores')).toBeInTheDocument();
    expect(screen.getByText('👗 Varejo & Moda')).toBeInTheDocument();
  });
});
