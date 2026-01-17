// Money Input Component with Brazilian currency formatting

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

const formatToCurrency = (cents: number): string => {
  const value = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const parseCurrencyToNumber = (formattedValue: string): number => {
  // Remove all non-numeric characters except digits
  const numericValue = formattedValue.replace(/\D/g, '');
  return parseInt(numericValue || '0', 10) / 100;
};

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className,
  disabled,
  id,
}) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value === 0 || isNaN(value)) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatToCurrency(value * 100));
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Extract only digits
    const numericOnly = inputValue.replace(/\D/g, '');
    
    if (numericOnly === '' || numericOnly === '0') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const cents = parseInt(numericOnly, 10);
    const formatted = formatToCurrency(cents);
    setDisplayValue(formatted);
    onChange(cents / 100);
  }, [onChange]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Move cursor to end on focus
    setTimeout(() => {
      e.target.setSelectionRange(e.target.value.length, e.target.value.length);
    }, 0);
  }, []);

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'font-mono text-right',
        className
      )}
    />
  );
};
