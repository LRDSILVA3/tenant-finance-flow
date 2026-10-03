import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import React, { useState } from 'react';

describe('AutoResizeTextarea Component', () => {
  it('deve renderizar como input de texto simples e aceitar escrita', () => {
    const handleChange = vi.fn();
    render(
      <AutoResizeTextarea
        placeholder="Descrição da venda..."
        onChange={handleChange}
        data-testid="auto-resize-textarea"
      />
    );

    const textarea = screen.getByTestId('auto-resize-textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('placeholder', 'Descrição da venda...');

    fireEvent.change(textarea, { target: { value: 'Venda balcão de teste' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('deve atualizar o valor controlado e ajustar a altura dinamicamente', () => {
    const TestComponent = () => {
      const [value, setValue] = useState('');
      return (
        <AutoResizeTextarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          data-testid="controlled-textarea"
        />
      );
    };

    render(<TestComponent />);
    const textarea = screen.getByTestId('controlled-textarea') as HTMLTextAreaElement;

    expect(textarea.value).toBe('');

    // Simula escrita de texto maior
    fireEvent.change(textarea, { target: { value: 'Linha 1\nLinha 2\nLinha 3' } });
    expect(textarea.value).toBe('Linha 1\nLinha 2\nLinha 3');
  });
});
