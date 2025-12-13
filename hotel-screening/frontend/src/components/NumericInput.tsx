import React, { useState, useEffect, useRef } from 'react';

interface NumericInputProps {
  value: number | string;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  decimals?: number;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  allowNegative?: boolean;
}

/**
 * Input numérico personalizado que:
 * - Acepta tanto "." como "," como separadores decimales
 * - Permite números negativos
 * - Formatea automáticamente a N decimales al perder foco
 * - Evita problemas de precisión de punto flotante
 */
export default function NumericInput({
  value,
  onChange,
  className = '',
  placeholder,
  required = false,
  disabled = false,
  decimals = 2,
  onFocus,
  allowNegative = true
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar el valor externo con el display value cuando no está enfocado
  useEffect(() => {
    if (!isFocused) {
      if (value === '' || value === null || value === undefined) {
        setDisplayValue('');
      } else {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (!isNaN(numValue)) {
          // Formato español: usar coma como separador decimal
          setDisplayValue(numValue.toFixed(decimals).replace('.', ','));
        } else {
          setDisplayValue('');
        }
      }
    }
  }, [value, isFocused, decimals]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
    onFocus?.(e);
  };

  const handleBlur = () => {
    setIsFocused(false);

    if (displayValue === '' || displayValue === '-') {
      onChange(0);
      return;
    }

    // Normalizar: reemplazar coma por punto
    const normalized = displayValue.replace(',', '.');
    const numValue = parseFloat(normalized);

    if (!isNaN(numValue)) {
      // Redondear al número de decimales especificado para evitar problemas de precisión
      const rounded = Math.round(numValue * Math.pow(10, decimals)) / Math.pow(10, decimals);
      onChange(rounded);
    } else {
      onChange(0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Permitir vacío
    if (newValue === '') {
      setDisplayValue('');
      return;
    }

    // Permitir solo un signo negativo al principio
    if (!allowNegative && newValue.includes('-')) {
      return;
    }

    // Permitir signo negativo solo al inicio
    if (newValue.startsWith('-')) {
      const rest = newValue.slice(1);
      if (rest.includes('-')) {
        return; // No permitir más de un signo negativo
      }
      // Permitir "-" solo
      if (rest === '') {
        setDisplayValue('-');
        return;
      }
    }

    // Reemplazar múltiples separadores decimales
    const commaCount = (newValue.match(/,/g) || []).length;
    const dotCount = (newValue.match(/\./g) || []).length;

    if (commaCount + dotCount > 1) {
      return; // No permitir múltiples separadores decimales
    }

    // Permitir solo números, un punto/coma decimal, y signo negativo
    const regex = allowNegative ? /^-?[0-9]*[.,]?[0-9]*$/ : /^[0-9]*[.,]?[0-9]*$/;

    if (regex.test(newValue)) {
      setDisplayValue(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir teclas de navegación y edición
    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      (e.ctrlKey || e.metaKey) // Permitir Ctrl+C, Ctrl+V, etc.
    ) {
      return;
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className={className}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
    />
  );
}
